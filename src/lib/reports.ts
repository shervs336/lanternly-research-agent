import "server-only";
import { createAdminClient } from "./supabase/server";
import type { SavedReport } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Anyone with the link can view a report (ids are random UUIDs, never listed publicly). */
export async function getReport(id: string): Promise<SavedReport | null> {
  if (!UUID.test(id)) return null;
  const db = createAdminClient();
  if (!db) return null;
  const { data } = await db
    .from("reports")
    .select("id, question, message, model, created_at")
    .eq("id", id)
    .maybeSingle();
  return (data as SavedReport | null) ?? null;
}

export async function listReports(userId: string) {
  const db = createAdminClient();
  if (!db) return [];
  const { data } = await db
    .from("reports")
    .select("id, question, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as Pick<SavedReport, "id" | "question" | "created_at">[];
}
