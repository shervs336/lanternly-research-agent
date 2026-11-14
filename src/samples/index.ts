import type { ResearchMessage } from "@/lib/types";
import { deriveRun } from "@/lib/derive";
import heatPumps from "./data/how-do-heat-pumps-perform-in-very-cold-climates.json";
import fourDayWeek from "./data/is-a-four-day-work-week-good-for-productivity.json";
import fasting from "./data/what-s-the-evidence-on-intermittent-fasting-for-weight-loss.json";

/**
 * Sample reports recorded from real Lanternly runs (unedited), so visitors can
 * watch the agent work without spending API quota. To record more, run the dev
 * server with RECORD_SAMPLES=1 and ask a question.
 */
export type Sample = {
  slug: string;
  question: string;
  recordedAt: string;
  sourceCount: number;
  citedCount: number;
  message: ResearchMessage;
};

type Raw = { slug: string; question: string; recordedAt: string; message: unknown };

function toSample(raw: Raw): Sample {
  const message = raw.message as ResearchMessage;
  const { sources } = deriveRun(message, true);
  return {
    slug: raw.slug,
    question: raw.question,
    recordedAt: raw.recordedAt,
    sourceCount: sources.length,
    citedCount: sources.filter((s) => s.cited).length,
    message,
  };
}

export const SAMPLES: Sample[] = [fourDayWeek, heatPumps, fasting].map((r) => toSample(r as Raw));
