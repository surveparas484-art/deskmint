import { AI_TASKS, MAX_REQUEST_BYTES, type AiTask } from "@/lib/ai/limits";
import { AiError, chat } from "@/lib/ai/openrouter";
import { checkRate, clientKey, refundRate } from "@/lib/ai/rate-limit";
import { ValidationError, buildPrompt, chunkNotesPrompt, chunkText, finalSummaryPrompt, singlePdfPrompt, validateInput } from "@/lib/ai/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const H = { "Cache-Control": "no-store" };
const fail = (status: number, error: string, code: string, retryable: boolean, extra: Record<string, string> = {}) =>
  Response.json({ ok: false, error, code, retryable }, { status, headers: { ...H, ...extra } });

async function pool<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i] as T, i); } }));
  return out;
}

export async function POST(req: Request) {
  const ip = clientKey(req);
  let deducted = false;

  try {
    const origin = req.headers.get("origin"), host = req.headers.get("host");
    if (origin && host) { try { if (new URL(origin).host !== host) return fail(403, "This request is not allowed.", "forbidden", false); } catch { return fail(403, "This request is not allowed.", "forbidden", false); } }
    if (!(req.headers.get("content-type") || "").includes("application/json")) return fail(415, "Unsupported request.", "bad_request", false);
    const raw = await req.text();
    if (raw.length > MAX_REQUEST_BYTES) return fail(413, "That request is too large.", "bad_request", false);
    let body: { task?: unknown; input?: unknown; options?: unknown };
    try { body = JSON.parse(raw); } catch { return fail(400, "Invalid request.", "bad_request", false); }
    if (!body || typeof body !== "object" || typeof body.task !== "string" || !(AI_TASKS as readonly string[]).includes(body.task)) return fail(400, "Unknown tool.", "bad_request", false);
    const task = body.task as AiTask;
    const text = validateInput(task, body.input);
    const opts = body.options && typeof body.options === "object" ? (body.options as Record<string, unknown>) : {};

    const rate = checkRate(ip);
    if (!rate.ok) {
      if (rate.reason === "daily_limit") {
        return fail(
          429,
          `You have used all ${rate.limit} free AI requests for today. Upgrade to DeskMint Pro for unlimited access!`,
          "daily_limit_reached",
          false,
          { "Retry-After": String(rate.retryAfterSec) }
        );
      }
      return fail(429, `You are sending requests too quickly. Please wait ${rate.retryAfterSec} seconds and try again.`, "rate_limited", true, { "Retry-After": String(rate.retryAfterSec) });
    }
    deducted = true;

    const quota = { remaining: rate.remaining, limit: rate.limit };

    if (task !== "pdf-summary") {
      const p = buildPrompt(task, text, opts);
      const out = await chat({ system: p.system, user: p.user, maxTokens: p.maxTokens, temperature: p.temperature, model: p.model });
      if (task === "translate") {
        const m = /^DETECTED:\s*(.+?)\s*\n-{3,}\s*\n([\s\S]*)$/.exec(out);
        if (m) return Response.json({ ok: true, text: (m[2] as string).trim(), detected: (m[1] as string).trim(), ...quota }, { headers: H });
      }
      return Response.json({ ok: true, text: out, ...quota }, { headers: H });
    }

    const chunks = chunkText(text);
    const wrapText = (t: string) => `<<<TEXT
${t.replace(/<<<TEXT|TEXT>>>/g, "")}
TEXT>>>`;
    if (chunks.length === 1) {
      const p = singlePdfPrompt();
      return Response.json({ ok: true, text: await chat({ ...p, user: wrapText(text) }), chunks: 1, ...quota }, { headers: H });
    }
    const notes = await pool(chunks, 3, (c, i) => { const p = chunkNotesPrompt(i + 1, chunks.length); return chat({ ...p, user: wrapText(c) }); });
    const p = finalSummaryPrompt();
    const final = await chat({ ...p, user: wrapText(notes.map((n, i) => `Part ${i + 1}:\n${n}`).join("\n\n")) });
    return Response.json({ ok: true, text: final, chunks: chunks.length, ...quota }, { headers: H });
  } catch (e) {
    if (deducted) refundRate(ip);
    if (e instanceof ValidationError) return fail(400, e.message, "bad_request", false);
    if (e instanceof AiError) return fail(e.status, e.message, e.code, e.retryable);
    console.error("ai: unexpected error");
    return fail(500, "Something went wrong. Please try again.", "provider_error", true);
  }
}

export function GET() { return fail(405, "Method not allowed.", "bad_request", false, { Allow: "POST" }); }