"use client";

import { useMemo, useState } from "react";
import { CheckIcon, DownloadIcon, LinkIcon, PrinterIcon } from "lucide-react";
import { deriveRun, toMarkdown } from "@/lib/derive";
import type { ResearchMessage } from "@/lib/types";
import { Timeline } from "@/components/timeline";
import { Report, SourceList } from "@/components/report";

type Props = {
  question: string;
  message: ResearchMessage | undefined;
  /** "running" while the agent works; "done" when finished (live or saved). */
  phase: "running" | "done";
  /** Show a share link (only when the report was saved). */
  shareId?: string;
  createdAt?: string;
};

export function RunView({ question, message, phase, shareId, createdAt }: Props) {
  const finished = phase === "done";
  const { steps, sources, text } = useMemo(() => deriveRun(message, finished), [message, finished]);
  const writing = !finished && text.length > 0;
  const [copied, setCopied] = useState(false);

  function download() {
    const blob = new Blob([toMarkdown(question, text, sources)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lanternly-${question.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function copyLink() {
    if (!shareId) return;
    await navigator.clipboard.writeText(`${window.location.origin}/r/${shareId}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const citedCount = sources.filter((s) => s.cited).length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10">
      {/* Agent activity */}
      <aside aria-label="Agent activity" className="no-print lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-line bg-night-2/70 p-2">
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">Agent log</p>
            <p className="font-mono text-[11px] text-muted">
              {sources.length} sources · {sources.filter((s) => s.read).length} read
            </p>
          </div>
          <Timeline steps={steps} waiting={!finished} />
        </div>
      </aside>

      {/* Report */}
      <article className="paper min-h-[60vh] rounded-2xl px-5 py-8 sm:px-10 sm:py-12">
        {!text && !finished && (
          <div aria-hidden className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded-md bg-paper-line/70" />
            {[92, 84, 88, 60].map((w) => (
              <div key={w} className="h-3.5 animate-pulse rounded bg-paper-line/60" style={{ width: `${w}%` }} />
            ))}
            <p className="pt-4 font-sans text-sm text-ink-soft">The report appears here once the agent has read enough to write.</p>
          </div>
        )}
        {text && <Report text={text} sources={sources} streaming={writing} />}
        {finished && !text && (
          <p className="font-sans text-ink-soft">The agent stopped before writing a report. Try rephrasing the question.</p>
        )}
        {finished && text && <SourceList sources={sources} />}

        {finished && text && (
          <div className="no-print mt-8 flex flex-wrap items-center gap-2 border-t border-paper-line pt-6 font-sans">
            <p className="mr-auto text-xs text-ink-soft">
              {citedCount} cited of {sources.length} sources
              {createdAt && ` · ${new Date(createdAt).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}`}
            </p>
            {shareId && (
              <button onClick={copyLink} className="action">
                {copied ? <CheckIcon className="size-4" /> : <LinkIcon className="size-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>
            )}
            <button onClick={download} className="action">
              <DownloadIcon className="size-4" /> Markdown
            </button>
            <button onClick={() => window.print()} className="action">
              <PrinterIcon className="size-4" /> Save PDF
            </button>
          </div>
        )}
      </article>
    </div>
  );
}
