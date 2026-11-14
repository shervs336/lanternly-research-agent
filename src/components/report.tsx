"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo } from "react";
import type { SourceInfo } from "@/lib/derive";

/** Turns [3] citation markers into links the renderer can style. */
function linkCitations(md: string) {
  return md.replace(/\[(\d{1,3})\](?!\()/g, "[$1](#cite-$1)");
}

function Cite({ n, source }: { n: number; source?: SourceInfo }) {
  if (!source) return <sup className="font-sans text-[0.7em] text-ink-soft">[{n}]</sup>;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${source.title} — ${source.domain}`}
      className="mx-[1px] inline-grid min-w-[1.35rem] -translate-y-[0.3em] place-items-center rounded-md bg-flame/25 px-1 font-sans text-[0.68rem] leading-[1.35rem] font-semibold text-cite no-underline transition-colors hover:bg-flame/50 focus-visible:outline-2 focus-visible:outline-cite"
      aria-label={`Source ${n}: ${source.title}`}
    >
      {n}
    </a>
  );
}

export function Report({ text, sources, streaming }: { text: string; sources: SourceInfo[]; streaming: boolean }) {
  const byId = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);
  const md = useMemo(() => linkCitations(text), [text]);

  return (
    <div className={`report ${streaming ? "caret" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const m = href?.match(/^#cite-(\d+)$/);
            if (m) return <Cite n={Number(m[1])} source={byId.get(Number(m[1]))} />;
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="ext">
                {children}
              </a>
            );
          },
          img: () => null,
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}

export function SourceList({ sources }: { sources: SourceInfo[] }) {
  if (!sources.length) return null;
  const ordered = [...sources].sort((a, b) => Number(b.cited) - Number(a.cited) || a.id - b.id);
  return (
    <section aria-labelledby="sources-heading" className="mt-10 border-t border-paper-line pt-6">
      <h2 id="sources-heading" className="font-sans text-xs font-semibold tracking-[0.18em] text-ink-soft uppercase">
        Sources
      </h2>
      <ol className="mt-4 space-y-3">
        {ordered.map((s) => (
          <li key={s.id} id={`source-${s.id}`} className={`flex gap-3 font-sans text-sm ${s.cited ? "" : "opacity-60"}`}>
            <span className="mt-0.5 grid h-5 min-w-5 place-items-center rounded-md bg-flame/25 px-1 text-[0.68rem] font-semibold text-cite">
              {s.id}
            </span>
            <span className="min-w-0">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline-offset-2 hover:underline">
                {s.title}
              </a>
              <span className="block text-xs text-ink-soft">
                {s.domain}
                {s.read && " · read in full"}
                {!s.cited && " · found, not cited"}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
