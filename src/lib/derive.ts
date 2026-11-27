import type { ResearchMessage } from "./types";

export type SourceInfo = { id: number; title: string; url: string; domain: string; read: boolean; cited: boolean };

export type Step =
  | { kind: "plan"; key: string; state: "running" | "done" | "error"; steps: string[] }
  | { kind: "search"; key: string; state: "running" | "done" | "error"; query: string; count: number; domains: string[] }
  | { kind: "read"; key: string; state: "running" | "done" | "error"; id: number; title: string; domain: string; chars?: number }
  | { kind: "write"; key: string; state: "running" | "done" }
  | {
      kind: "investigate";
      key: string;
      state: "running" | "done" | "error";
      agents: { question: string; state: "running" | "done" | "error"; searches: number; reads: number[]; sources: number }[];
    };

export const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const stateOf = (s: string) =>
  s === "output-available" ? "done" : s === "output-error" || s === "output-denied" ? "error" : "running";

/**
 * Models sometimes write grouped citations like [2, 7] or [3-5]. Normalize
 * them to [2][7] / [3][4][5] so every number becomes its own citation.
 */
export function normalizeCitations(md: string) {
  return md.replace(/\[(\d{1,3}(?:\s*[,;–-]\s*\d{1,3})+)\](?!\()/g, (_, inner: string) => {
    const nums: number[] = [];
    for (const piece of inner.split(/\s*[,;]\s*/)) {
      const range = piece.match(/^(\d+)\s*[–-]\s*(\d+)$/);
      if (range) {
        const [a, b] = [Number(range[1]), Number(range[2])];
        if (b >= a && b - a <= 10) for (let n = a; n <= b; n++) nums.push(n);
      } else if (/^\d+$/.test(piece)) nums.push(Number(piece));
    }
    return nums.map((n) => `[${n}]`).join("");
  });
}

export function reportText(message: ResearchMessage | undefined) {
  if (!message) return "";
  return normalizeCitations(
    message.parts
      .flatMap((p) => (p.type === "text" ? [p.text] : []))
      .join("\n\n")
      .trim(),
  );
}

export function deriveRun(message: ResearchMessage | undefined, finished: boolean) {
  const sources = new Map<number, SourceInfo>();
  const steps: Step[] = [];
  if (!message) return { steps, sources: [] as SourceInfo[], text: "" };

  const text = reportText(message);
  const cited = new Set(Array.from(text.matchAll(/\[(\d{1,3})\]/g), (m) => Number(m[1])));

  for (const part of message.parts) {
    if (part.type === "tool-plan") {
      steps.push({
        kind: "plan",
        key: part.toolCallId,
        state: stateOf(part.state),
        steps: part.state === "output-available" ? part.output.steps : (part.input?.steps?.filter(Boolean) as string[]) ?? [],
      });
    } else if (part.type === "tool-search") {
      const results = part.state === "output-available" ? part.output.results : [];
      results.forEach((r) => {
        if (!sources.has(r.id)) {
          sources.set(r.id, { id: r.id, title: r.title, url: r.url, domain: domainOf(r.url), read: false, cited: cited.has(r.id) });
        }
      });
      steps.push({
        kind: "search",
        key: part.toolCallId,
        state: stateOf(part.state),
        query: part.input?.query ?? "",
        count: results.length,
        domains: Array.from(new Set(results.map((r) => domainOf(r.url)))).slice(0, 4),
      });
    } else if (part.type === "tool-investigate") {
      // Streams preliminary outputs while the researchers work; the last one is final.
      const out = part.state === "output-available" ? part.output : undefined;
      const agents = out?.agents ?? (part.input?.questions ?? []).filter(Boolean).map((q) => ({ question: q as string, state: "running" as const, searches: [], reads: [], sources: [], findings: "" }));
      for (const a of agents) {
        for (const s of a.sources) {
          if (!sources.has(s.id)) sources.set(s.id, { id: s.id, title: s.title, url: s.url, domain: domainOf(s.url), read: false, cited: cited.has(s.id) });
        }
      }
      for (const a of agents) for (const id of a.reads) { const src = sources.get(id); if (src) src.read = true; }
      const preliminary = (part as { preliminary?: boolean }).preliminary === true || (out ? !out.done : false);
      steps.push({
        kind: "investigate",
        key: part.toolCallId,
        state: part.state === "output-available" && !preliminary ? "done" : stateOf(part.state) === "error" ? "error" : "running",
        agents: agents.map((a) => ({ question: a.question, state: a.state, searches: a.searches.length, reads: a.reads, sources: a.sources.length })),
      });
    } else if (part.type === "tool-read") {
      const id = part.input?.id ?? 0;
      const src = sources.get(id);
      // Count it as read only if the page actually had text (blocked pages return almost nothing).
      if (src && part.state === "output-available" && part.output.chars >= 800) src.read = true;
      steps.push({
        kind: "read",
        key: part.toolCallId,
        state: stateOf(part.state),
        id,
        title: src?.title ?? `Source ${id}`,
        domain: src?.domain ?? "",
        chars: part.state === "output-available" ? part.output.chars : undefined,
      });
    }
  }
  if (text) steps.push({ kind: "write", key: "write", state: finished ? "done" : "running" });

  return { steps, sources: Array.from(sources.values()).sort((a, b) => a.id - b.id), text };
}

/** Markdown export: the report plus a numbered source list. */
export function toMarkdown(question: string, text: string, sources: SourceInfo[]) {
  const used = sources.filter((s) => s.cited);
  const list = (used.length ? used : sources).map((s) => `[${s.id}] ${s.title} — ${s.url}`).join("\n");
  return `${text}\n\n---\n\n**Sources**\n\n${list}\n\n_Researched with Lanternly · Question: ${question}_\n`;
}
