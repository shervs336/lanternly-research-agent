import { generateText, isStepCount, tool } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { researcherPrompt } from "./prompt";
import { readPage, tavilySearch, type Source } from "./sources";

type Agent = {
  question: string;
  state: "running" | "done" | "error";
  searches: string[];
  reads: number[];
  sources: { id: number; title: string; url: string }[];
  findings: string;
};

const MAX_READ_CHARS = 6000;

/**
 * Tools are created per request so each research run has its own numbered
 * source list. The model cites sources by these numbers, e.g. [3].
 */
export function createResearchTools(signal?: AbortSignal, model = "gemini-3.5-flash-lite") {
  const sources = new Map<number, Source>();
  const byUrl = new Map<string, number>();

  const tools = {
    plan: tool({
      description:
        "Call this first, exactly once. Break the question into 3-5 focused research steps you will take.",
      inputSchema: z.object({
        steps: z.array(z.string().min(3).max(160)).min(2).max(6).describe("Short research steps, in order"),
      }),
      execute: async ({ steps }) => ({ steps }),
    }),

    search: tool({
      description:
        "Search the web. Returns numbered sources with snippets. Use specific queries; run 2-4 searches covering different angles.",
      inputSchema: z.object({ query: z.string().min(2).max(200).describe("A focused web search query") }),
      execute: async ({ query }) => {
        const results = await tavilySearch(query, signal);
        const numbered = results.map((r) => {
          let id = byUrl.get(r.url);
          if (!id) {
            id = sources.size + 1;
            sources.set(id, { id, ...r });
            byUrl.set(r.url, id);
          }
          return { id, title: r.title, url: r.url, snippet: r.snippet };
        });
        return { query, results: numbered };
      },
    }),

    read: tool({
      description:
        "Read the full text of a source returned by search, by its number. Read the 2-4 most promising sources before writing.",
      inputSchema: z.object({ id: z.number().int().positive().describe("The source number from search results") }),
      execute: async ({ id }) => {
        // Only sources that search returned can be read: the model can't be steered into fetching arbitrary URLs.
        const source = sources.get(id);
        if (!source) throw new Error(`There is no source [${id}]. Use a number from the search results.`);
        let text: string;
        try {
          text = await readPage(source.url, signal);
        } catch (err) {
          console.error("[read]", source.url, err);
          throw new Error(`Couldn't read [${id}]. Try another source.`);
        }
        // Paywalls, cookie walls and blocked pages come back nearly empty.
        if (text.length < 800) {
          throw new Error(`[${id}] had almost no readable text (blocked or paywalled). Rely on its snippet or read another source.`);
        }
        {
          return {
            id,
            title: source.title,
            url: source.url,
            chars: text.length,
            content: text.slice(0, MAX_READ_CHARS),
          };
        }
      },
    }),
  };

  // ---------- Deep mode: parallel researcher sub-agents ----------
  return {
    ...tools,
    investigate: tool({
      description:
        "Deep mode only. Call once, right after plan: send 2-3 researcher agents to investigate distinct sub-questions in parallel. Each searches and reads on its own and returns findings with source numbers.",
      inputSchema: z.object({
        questions: z.array(z.string().min(8).max(200)).min(2).max(3).describe("Distinct sub-questions that together answer the user's question"),
      }),
      // An async generator: every yield streams progress to the timeline; the last one is the result.
      async *execute({ questions }) {
        const agents: Agent[] = questions.map((question) => ({ question, state: "running", searches: [], reads: [], sources: [], findings: "" }));
        let changed = true;
        let wake: () => void = () => {};
        const notify = () => {
          changed = true;
          wake();
        };
        const run = async (agent: Agent) => {
          try {
            const { text } = await generateText({
              model: google(model),
              system: researcherPrompt(),
              prompt: agent.question,
              // Researchers share the run's numbered source list, so citations stay consistent.
              tools: { search: tools.search, read: tools.read },
              temperature: 0.2,
              abortSignal: signal,
              stopWhen: isStepCount(6),
              prepareStep: ({ stepNumber }) => (stepNumber >= 5 ? { activeTools: [] } : {}),
              onStepFinish: ({ toolResults }) => {
                for (const r of toolResults) {
                  if (r.toolName === "search") {
                    const out = r.output as { query: string; results: { id: number; title: string; url: string }[] };
                    agent.searches.push(out.query);
                    for (const s of out.results) if (!agent.sources.some((x) => x.id === s.id)) agent.sources.push({ id: s.id, title: s.title, url: s.url });
                  } else if (r.toolName === "read") agent.reads.push((r.output as { id: number }).id);
                }
                notify();
              },
            });
            agent.findings = text.trim().slice(0, 2500);
            agent.state = "done";
          } catch (e) {
            if (signal?.aborted) throw e;
            console.error("[investigate]", e);
            agent.state = "error";
            agent.findings = "This researcher couldn't finish.";
          }
          notify();
        };
        let finished = false;
        const all = Promise.all(agents.map(run)).finally(() => {
          finished = true;
          wake();
        });
        while (!finished) {
          if (!changed) await new Promise<void>((resolve) => (wake = resolve));
          changed = false;
          yield { agents: agents.map((a) => ({ ...a, findings: "" })), done: false };
        }
        await all;
        // The lead agent reads compact findings, not every page the researchers read.
        yield { agents, done: true };
      },
    }),
  };
}

export type ResearchTools = ReturnType<typeof createResearchTools>;
