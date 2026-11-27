import { AlertTriangleIcon, BookOpenIcon, CheckIcon, ListChecksIcon, NetworkIcon, PenLineIcon, SearchIcon } from "lucide-react";
import type { Step } from "@/lib/derive";

const ICONS = { plan: ListChecksIcon, search: SearchIcon, read: BookOpenIcon, write: PenLineIcon, investigate: NetworkIcon };

function Status({ state }: { state: Step["state"] }) {
  if (state === "running")
    return <span className="size-3.5 animate-spin rounded-full border-2 border-flame/25 border-t-flame" aria-label="In progress" />;
  if (state === "error") return <AlertTriangleIcon className="size-3.5 text-flame-deep" aria-label="Failed" />;
  return <CheckIcon className="size-3.5 text-emerald-300" aria-label="Done" />;
}

function Label({ step }: { step: Step }) {
  switch (step.kind) {
    case "plan":
      return (
        <>
          <p className="text-text">{step.state === "running" ? "Planning the research…" : "Made a plan"}</p>
          {step.steps.length > 0 && (
            <ol className="mt-2 space-y-1 text-[13px] text-muted">
              {step.steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-flame/70">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      );
    case "search":
      return (
        <>
          <p className="text-text">
            {step.state === "running" ? "Searching" : "Searched"} <span className="text-muted">for</span>{" "}
            <q className="text-flame/90">{step.query || "…"}</q>
          </p>
          {step.state === "done" && (
            <p className="mt-1 font-mono text-[12px] text-muted">
              {step.count} results · {step.domains.join(" · ")}
            </p>
          )}
          {step.state === "error" && <p className="mt-1 text-[12px] text-flame-deep">Search failed</p>}
        </>
      );
    case "read":
      return (
        <>
          <p className="text-text">
            {step.state === "running" ? "Reading" : step.state === "error" ? "Couldn't read" : "Read"}{" "}
            <span className="font-mono text-flame/90">[{step.id}]</span>
          </p>
          <p className="mt-1 line-clamp-2 text-[13px] text-muted">
            {step.title}
            {step.domain && <span className="font-mono text-[12px]"> · {step.domain}</span>}
          </p>
          {step.chars != null && (
            <p className="mt-0.5 font-mono text-[12px] text-muted/80">{step.chars.toLocaleString("en-US")} characters</p>
          )}
        </>
      );
    case "investigate":
      return (
        <>
          <p className="text-text">
            {step.state === "running" ? `${step.agents.length} researchers are working in parallel…` : `${step.agents.length} researchers reported back`}
          </p>
          <ul className="mt-2 space-y-2">
            {step.agents.map((a, i) => (
              <li key={i} className="rounded-lg border border-line bg-night-3/60 px-3 py-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">
                    <Status state={a.state} />
                  </span>
                  <span className="text-[13px] text-text">{a.question}</span>
                </div>
                <p className="mt-1 pl-5.5 font-mono text-[11.5px] text-muted">
                  {a.searches} {a.searches === 1 ? "search" : "searches"} · {a.sources} sources
                  {a.reads.length > 0 && <> · read {a.reads.map((id) => `[${id}]`).join("")}</>}
                </p>
              </li>
            ))}
          </ul>
        </>
      );
    case "write":
      return <p className="text-text">{step.state === "running" ? "Writing the report…" : "Wrote the report"}</p>;
  }
}

export function Timeline({ steps, waiting }: { steps: Step[]; waiting: boolean }) {
  return (
    <ol aria-label="What the agent did" aria-live="polite" className="relative space-y-1">
      {steps.map((step, i) => {
        const Icon = ICONS[step.kind];
        return (
          <li key={step.key} className="rise relative flex gap-3 rounded-xl px-3 py-2.5 text-sm">
            {i < steps.length - 1 && <span aria-hidden className="absolute top-10 bottom-0 left-[1.62rem] w-px bg-line" />}
            <span className="relative grid size-7 shrink-0 place-items-center rounded-full border border-line bg-night-3 text-muted">
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <Label step={step} />
            </div>
            <span className="pt-1.5">
              <Status state={step.state} />
            </span>
          </li>
        );
      })}
      {waiting && steps.length === 0 && (
        <li className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted">
          <span className="size-3.5 animate-spin rounded-full border-2 border-flame/25 border-t-flame" />
          Lighting the lantern…
        </li>
      )}
    </ol>
  );
}
