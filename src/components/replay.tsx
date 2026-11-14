"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayIcon, SkipForwardIcon } from "lucide-react";
import type { ResearchMessage } from "@/lib/types";
import { RunView } from "@/components/run-view";

type Part = ResearchMessage["parts"][number];

/**
 * Replays a recorded run: each tool step appears "running" briefly, then
 * completes; the report text then types out. Timing is compressed so a
 * 60-second run replays in about 15 seconds.
 */
function useReplay(message: ResearchMessage, playing: boolean) {
  const steps = useMemo(() => message.parts.filter((p) => p.type !== "step-start"), [message]);
  const textIndex = steps.findIndex((p) => p.type === "text");
  const toolCount = textIndex === -1 ? steps.length : textIndex;
  const fullText = useMemo(
    () => steps.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n\n"),
    [steps],
  );
  const [tick, setTick] = useState(0); // 2 ticks per tool (running, done), then text characters

  useEffect(() => {
    if (!playing) return;
    const totalToolTicks = toolCount * 2;
    if (tick < totalToolTicks) {
      const t = setTimeout(() => setTick((n) => n + 1), tick % 2 === 0 ? 650 : 250);
      return () => clearTimeout(t);
    }
    const shown = tick - totalToolTicks;
    if (shown < fullText.length) {
      const t = setTimeout(() => setTick((n) => n + 18), 16);
      return () => clearTimeout(t);
    }
  }, [tick, playing, toolCount, fullText.length]);

  if (!playing) return { message, done: true };

  const toolTicks = toolCount * 2;
  const visibleTools = Math.min(toolCount, Math.ceil(tick / 2));
  const parts: Part[] = steps.slice(0, visibleTools).map((p, i) => {
    const running = i === visibleTools - 1 && tick < toolTicks && tick % 2 === 1;
    if (running && "state" in p && p.type.startsWith("tool-")) {
      return { ...p, state: "input-available", output: undefined } as Part;
    }
    return p;
  });
  const chars = Math.max(0, tick - toolTicks);
  if (chars > 0) parts.push({ type: "text", text: fullText.slice(0, chars), state: "streaming" } as Part);
  return { message: { ...message, parts }, done: chars >= fullText.length && tick >= toolTicks };
}

export function Replay({ question, message, recordedAt }: { question: string; message: ResearchMessage; recordedAt: string }) {
  const [playing, setPlaying] = useState(true);
  const [run, setRun] = useState(0);
  const { message: shown, done } = useReplay(message, playing);

  return (
    <>
      <div className="no-print mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-flame uppercase">
            Sample report · recorded {new Date(recordedAt).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}
          </p>
          <h1 className="mt-2 max-w-3xl font-serif text-2xl leading-snug text-text sm:text-3xl">{question}</h1>
        </div>
        {playing && !done ? (
          <button onClick={() => setPlaying(false)} className="btn-ghost">
            <SkipForwardIcon className="size-3.5" /> Skip replay
          </button>
        ) : (
          <button
            onClick={() => {
              setPlaying(true);
              setRun((n) => n + 1);
            }}
            className="btn-ghost"
          >
            <PlayIcon className="size-3.5" /> Replay
          </button>
        )}
      </div>
      <RunView key={run} question={question} message={shown} phase={done ? "done" : "running"} />
    </>
  );
}
