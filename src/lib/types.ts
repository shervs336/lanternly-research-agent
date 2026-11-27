import type { InferUITools, UIMessage } from "ai";
import type { ResearchTools } from "./agent/tools";

export type ReportMeta = { reportId?: string; model?: string; deep?: boolean };

/** A research run as the UI sees it: one assistant message whose parts are plan/search/read tool calls and the report text. */
export type ResearchMessage = UIMessage<ReportMeta, never, InferUITools<ResearchTools>>;

export type SavedReport = {
  id: string;
  question: string;
  message: ResearchMessage;
  model: string | null;
  created_at: string;
};
