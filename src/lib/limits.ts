import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "./supabase/server";

/**
 * Daily limits that keep the free API quotas (Gemini, Tavily) from running out.
 * Every run is recorded in the `runs` table; the IP is stored only as a salted hash.
 */
export const LIMITS = { anonymous: 3, signedIn: 10, global: 60 };

export function hashIp(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const salt = process.env.RATE_LIMIT_SALT || process.env.SUPABASE_SECRET_KEY || "lanternly";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

type Result = { ok: true } | { ok: false; message: string };

const memory: { at: number; key: string }[] = []; // dev fallback when Supabase isn't configured

export async function checkAndRecordRun({ userId, ipHash }: { userId: string | null; ipHash: string }): Promise<Result> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const limit = userId ? LIMITS.signedIn : LIMITS.anonymous;
  const tooMany: Result = {
    ok: false,
    message: userId
      ? `You've used today's ${limit} research runs. Come back tomorrow.`
      : `You've used today's ${limit} free runs. Sign in for ${LIMITS.signedIn} a day.`,
  };
  const db = createAdminClient();

  if (!db) {
    const key = userId ?? ipHash;
    const recent = memory.filter((r) => r.at > Date.now() - 864e5);
    if (recent.filter((r) => r.key === key).length >= limit) return tooMany;
    memory.push({ at: Date.now(), key });
    return { ok: true };
  }

  const mine = db.from("runs").select("id", { count: "exact", head: true }).gte("created_at", since);
  const [{ count: own }, { count: all }] = await Promise.all([
    userId ? mine.eq("user_id", userId) : mine.eq("ip_hash", ipHash),
    db.from("runs").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);
  if ((all ?? 0) >= LIMITS.global) {
    return { ok: false, message: "Lanternly has hit its daily research budget. Please try again tomorrow." };
  }
  if ((own ?? 0) >= limit) return tooMany;

  const { error } = await db.from("runs").insert({ user_id: userId, ip_hash: ipHash });
  if (error) console.error("[limits] insert", error.message);
  return { ok: true };
}
