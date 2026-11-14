"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRightIcon, ArrowUpIcon, RotateCcwIcon, SquareIcon } from "lucide-react";
import type { ResearchMessage } from "@/lib/types";
import { RunView } from "@/components/run-view";
import { LanternMark } from "@/components/logo";
import { SAMPLES } from "@/samples";

const EXAMPLES = [
  "Is a four-day work week good for productivity?",
  "How do heat pumps perform in very cold climates?",
  "What's the evidence on intermittent fasting for weight loss?",
  "Which open-source databases are best for time-series data?",
];

function readableError(err: Error | undefined) {
  if (!err) return null;
  try {
    const parsed = JSON.parse(err.message) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {}
  return err.message || "Something went wrong. Please try again.";
}

export function ResearchApp({ liveEnabled }: { liveEnabled: boolean }) {
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, sendMessage, status, error, stop, setMessages } = useChat<ResearchMessage>({
    transport: new DefaultChatTransport({ api: "/api/research" }),
  });

  const assistant = useMemo(() => messages.find((m) => m.role === "assistant"), [messages]);
  const running = status === "submitted" || status === "streaming";
  const errorText = readableError(error);

  function start(q: string) {
    const text = q.trim();
    if (text.length < 8 || running) return;
    setQuestion(text);
    setMessages([]);
    void sendMessage({ text });
    setInput("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    if (running) void stop();
    setMessages([]);
    setQuestion(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  if (question) {
    return (
      <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6 sm:pt-12">
        <div className="no-print mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-flame uppercase">
              {running ? "Researching" : errorText ? "Stopped" : "Research complete"}
            </p>
            <h1 className="mt-2 max-w-3xl font-serif text-2xl leading-snug text-text sm:text-3xl">{question}</h1>
          </div>
          <div className="flex gap-2">
            {running && (
              <button onClick={() => stop()} className="btn-ghost">
                <SquareIcon className="size-3.5" /> Stop
              </button>
            )}
            <button onClick={reset} className="btn-ghost">
              <RotateCcwIcon className="size-3.5" /> New question
            </button>
          </div>
        </div>

        {errorText && (
          <div role="alert" className="no-print mb-6 rounded-xl border border-flame/30 bg-flame/10 px-4 py-3 text-sm text-text">
            {errorText}
          </div>
        )}

        <RunView
          question={question}
          message={assistant}
          phase={running ? "running" : "done"}
          shareId={!running && !errorText ? assistant?.metadata?.reportId : undefined}
        />
      </main>
    );
  }

  return (
    <main>
      <section className="lantern-glow relative overflow-hidden px-4 pt-20 pb-16 sm:pt-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <LanternMark className="size-12 text-text/80" />
          <h1 className="mt-6 font-serif text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-balance text-text sm:text-6xl">
            Research that <em className="text-flame">shows its work.</em>
          </h1>
          <p className="mt-5 max-w-xl text-base text-balance text-muted sm:text-lg">
            Ask a question. Lanternly plans, searches the web, reads the sources and writes a cited report, and you watch
            every step.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              start(input);
            }}
            className="mt-10 w-full"
          >
            <label htmlFor="question" className="sr-only">
              Your research question
            </label>
            <div className="group relative rounded-2xl border border-line bg-night-2/80 p-2 shadow-[0_20px_60px_-25px_rgba(255,200,97,0.35)] backdrop-blur transition-colors focus-within:border-flame/50">
              <textarea
                id="question"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    start(input);
                  }
                }}
                rows={3}
                maxLength={300}
                disabled={!liveEnabled}
                placeholder={liveEnabled ? "What do you want to know?" : "Live research is turned off here. Try a sample below."}
                className="block w-full resize-none bg-transparent px-3 py-2 text-base text-text outline-none placeholder:text-muted/70 disabled:cursor-not-allowed"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="font-mono text-[11px] text-muted">{input.length}/300 · Enter to run</span>
                <button
                  type="submit"
                  disabled={!liveEnabled || input.trim().length < 8}
                  aria-label="Start research"
                  className="grid size-9 place-items-center rounded-full bg-flame text-night transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame"
                >
                  <ArrowUpIcon className="size-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </form>

          {liveEnabled && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((q) => (
                <button key={q} onClick={() => start(q)} className="rounded-full border border-line px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-flame/40 hover:text-text">
                  {q}
                </button>
              ))}
            </div>
          )}
          <p className="mt-6 text-xs text-muted/80">Every claim is linked to a source · Usually 30–60 seconds · Free daily runs</p>
        </div>
      </section>

      <HowItWorks />

      {SAMPLES.length > 0 && (
        <section aria-labelledby="samples-heading" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <h2 id="samples-heading" className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
            Sample reports
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {SAMPLES.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/sample/${s.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-night-2/60 p-5 transition-colors hover:border-flame/40"
                >
                  <p className="font-serif text-lg leading-snug text-text">{s.question}</p>
                  <p className="mt-auto pt-6 font-mono text-[12px] text-muted">
                    {s.sourceCount} sources · {s.citedCount} cited
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm text-flame">
                    Watch the replay <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function HowItWorks() {
  const steps = [
    ["Plan", "Breaks your question into focused research steps."],
    ["Search", "Runs several web searches from different angles."],
    ["Read", "Opens the most promising sources and reads them in full."],
    ["Write", "Writes a report where every claim links to its source."],
  ];
  return (
    <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <h2 id="how-heading" className="sr-only">
        How it works
      </h2>
      <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([t, d], i) => (
          <li key={t} className="bg-night p-6">
            <p className="font-mono text-xs text-flame">0{i + 1}</p>
            <p className="mt-2 font-serif text-xl text-text">{t}</p>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
