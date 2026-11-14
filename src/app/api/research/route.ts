import { createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream } from "ai";
import { google } from "@ai-sdk/google";
import { createResearchTools } from "@/lib/agent/tools";
import { systemPrompt } from "@/lib/agent/prompt";
import { checkAndRecordRun, hashIp } from "@/lib/limits";
import { createAdminClient, currentUserId } from "@/lib/supabase/server";
import type { ResearchMessage } from "@/lib/types";

export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const MAX_STEPS = 12;

const json = (status: number, error: string) => Response.json({ error }, { status });

/** Local development only: saves a finished run as a sample report fixture. */
async function recordSample(question: string, message: unknown) {
  const { writeFile } = await import("node:fs/promises");
  const slug = question.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const file = `${process.cwd()}/src/samples/data/${slug}.json`;
  await writeFile(file, JSON.stringify({ slug, question, recordedAt: new Date().toISOString(), message }, null, 2));
  console.info("[research] recorded sample", file);
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY || !process.env.TAVILY_API_KEY) {
    return json(503, "Live research isn't configured on this deployment yet. Try a sample report.");
  }

  let messages: ResearchMessage[];
  try {
    ({ messages } = (await req.json()) as { messages: ResearchMessage[] });
  } catch {
    return json(400, "Invalid request.");
  }
  const last = messages?.at(-1);
  const question =
    last?.role === "user"
      ? last.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join(" ").trim()
      : "";
  if (question.length < 8) return json(400, "Ask a slightly longer question (at least 8 characters).");
  if (question.length > 300) return json(400, "Keep the question under 300 characters.");

  const userId = await currentUserId();
  const limit = await checkAndRecordRun({ userId, ipHash: hashIp(req) });
  if (!limit.ok) return json(429, limit.message);

  const reportId = crypto.randomUUID();
  const tools = createResearchTools(req.signal);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const result = streamText({
    model: google(MODEL),
    system: systemPrompt(today),
    prompt: question,
    tools,
    temperature: 0.3,
    stopWhen: isStepCount(MAX_STEPS),
    abortSignal: req.signal,
    prepareStep: ({ stepNumber }) => {
      if (stepNumber === 0) return { toolChoice: { type: "tool", toolName: "plan" } };
      // Leave the last steps for writing: no more tools.
      if (stepNumber >= MAX_STEPS - 3) return { activeTools: [] };
      return {};
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      messageMetadata: ({ part }) => (part.type === "start" ? { reportId, model: MODEL } : undefined),
      onError: (error) => {
        console.error("[research]", error);
        const text = String((error as Error)?.message ?? error);
        if (/quota|rate|429|exhausted/i.test(text)) {
          return "The AI model's free tier is busy right now. Please try again in a minute.";
        }
        return "Something went wrong while researching. Please try again.";
      },
      onEnd: async ({ responseMessage, isAborted }) => {
        if (isAborted) return;
        const hasReport = responseMessage.parts.some((p) => p.type === "text" && p.text.trim().length > 40);
        if (!hasReport) return;
        if (process.env.RECORD_SAMPLES === "1" && process.env.NODE_ENV === "development") {
          await recordSample(question, responseMessage);
        }
        const db = createAdminClient();
        if (!db) return;
        const { error } = await db.from("reports").insert({
          id: reportId,
          user_id: userId,
          question,
          message: { ...responseMessage, metadata: { reportId, model: MODEL } },
          model: MODEL,
        });
        if (error) console.error("[research] save", error.message);
      },
    }),
  });
}
