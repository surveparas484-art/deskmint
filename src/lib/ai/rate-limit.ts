// Per-IP daily free quota (default 3/day) + short burst protection.
import { DAILY_FREE_AI_LIMIT } from "./limits";

const DAY_MS = 24 * 60 * 60 * 1000;
const hits = new Map<string, number[]>();
const MAX_KEYS = 8000;

export type RateResult =
  | { ok: true; remaining: number; limit: number }
  | { ok: false; reason: "daily_limit" | "burst"; retryAfterSec: number; remaining: number; limit: number };

export function getDailyLimit(): number {
  const envVal = Number(process.env.AI_DAILY_FREE_LIMIT);
  return Number.isFinite(envVal) && envVal > 0 ? Math.floor(envVal) : DAILY_FREE_AI_LIMIT;
}

export function checkRate(key: string, now = Date.now()): RateResult {
  const dailyLimit = getDailyLimit();
  const perMin = Number(process.env.AI_RATE_PER_MINUTE) || 6;

  const list = (hits.get(key) ?? []).filter((t) => now - t < DAY_MS);
  if (list.length >= dailyLimit) {
    const oldest = list[0] as number;
    return {
      ok: false,
      reason: "daily_limit",
      retryAfterSec: Math.max(60, Math.ceil((DAY_MS - (now - oldest)) / 1000)),
      remaining: 0,
      limit: dailyLimit,
    };
  }

  const lastMin = list.filter((t) => now - t < 60_000);
  if (lastMin.length >= perMin) {
    return {
      ok: false,
      reason: "burst",
      retryAfterSec: Math.max(1, Math.ceil((60_000 - (now - (lastMin[0] as number))) / 1000)),
      remaining: Math.max(0, dailyLimit - list.length),
      limit: dailyLimit,
    };
  }

  list.push(now);
  hits.delete(key);
  hits.set(key, list);
  if (hits.size > MAX_KEYS) {
    const first = hits.keys().next().value;
    if (first !== undefined) hits.delete(first);
  }
  return { ok: true, remaining: Math.max(0, dailyLimit - list.length), limit: dailyLimit };
}

/** Refunds the most recent request if the AI call failed before returning output. */
export function refundRate(key: string) {
  const list = hits.get(key);
  if (list && list.length > 0) {
    list.pop();
    hits.set(key, list);
  }
}

export const resetRateLimit = () => hits.clear();

export function clientKey(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  return (xf ? xf.split(",")[0] : req.headers.get("x-real-ip") || "unknown")?.trim() || "unknown";
}