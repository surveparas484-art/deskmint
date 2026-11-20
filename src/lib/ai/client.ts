// Browser helper for the /api/ai route.
import type { AiTask } from "./limits";

export interface AiResult { text: string; detected?: string; chunks?: number; remaining?: number; limit?: number }

export class AiClientError extends Error {
  constructor(message: string, public retryable: boolean, public code?: string) { super(message); }
}

export async function callAi(task: AiTask, input: string, options: Record<string, unknown> = {}): Promise<AiResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 70_000);
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, input, options }),
      signal: ctrl.signal,
    });
    let data: { ok?: boolean; text?: string; detected?: string; chunks?: number; remaining?: number; limit?: number; error?: string; code?: string; retryable?: boolean } | null = null;
    try { data = await res.json(); } catch { /* not JSON */ }
    if (!res.ok || !data || !data.ok || typeof data.text !== "string") {
      throw new AiClientError(
        data?.error || "Something went wrong. Please try again.",
        data?.retryable ?? res.status >= 500,
        data?.code
      );
    }
    return { text: data.text, detected: data.detected, chunks: data.chunks, remaining: data.remaining, limit: data.limit };
  } catch (e) {
    if (e instanceof AiClientError) throw e;
    if (e instanceof Error && e.name === "AbortError") throw new AiClientError("This is taking too long. Please try again.", true, "timeout");
    throw new AiClientError("Could not reach the server. Check your connection and try again.", true, "network");
  } finally { clearTimeout(timer); }
}
