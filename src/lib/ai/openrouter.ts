// Central AI completion client. SERVER ONLY: reads credentials strictly from environment variables.
import { siteConfig } from "@/config/site";

export type AiErrorCode = "not_configured" | "rate_limited" | "daily_limit_reached" | "model_unavailable" | "provider_error" | "timeout" | "bad_response" | "bad_request";

export class AiError extends Error {
  constructor(public code: AiErrorCode, public status: number, message: string, public retryable: boolean) { super(message); }
}

export type ModelKind = "default" | "translation";

// Strictly exclude Chinese-origin AI model providers/families per security policy
const BLOCKED_MODEL_PATTERNS = [
  "deepseek", "qwen", "01-ai", "yi-", "/yi", "z-ai", "zhipu", "glm",
  "baichuan", "minimax", "moonshot", "kimi", "bytedance", "doubao",
  "stepfun", "internlm", "sensetime", "tencent", "hunyuan", "baidu", "ernie",
];

// Trusted non-Chinese fallback models (free tier)
const TRUSTED_FREE_FALLBACKS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
];

function isBlockedModel(id: string): boolean {
  const lower = id.toLowerCase();
  return BLOCKED_MODEL_PATTERNS.some((p) => lower.includes(p));
}

function isAllowedModel(id: string): boolean {
  if (!id || isBlockedModel(id)) return false;
  if (!id.endsWith(":free") && process.env.OPENROUTER_ALLOW_PAID !== "true") return false;
  return true;
}

export function getCandidateModels(kind: ModelKind): string[] {
  const primary = ((kind === "translation" ? process.env.OPENROUTER_TRANSLATION_MODEL : "") || process.env.OPENROUTER_MODEL || "").trim();
  const list: string[] = [];
  if (primary && isAllowedModel(primary)) list.push(primary);
  for (const fb of TRUSTED_FREE_FALLBACKS) {
    if (!list.includes(fb) && isAllowedModel(fb)) list.push(fb);
  }
  if (list.length === 0) {
    throw new AiError("not_configured", 503, "AI features are temporarily unavailable. Please try again later.", false);
  }
  return list;
}

export interface ChatInput { system: string; user: string; maxTokens: number; temperature?: number; model: ModelKind; timeoutMs?: number }

export async function chat(i: ChatInput): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new AiError("not_configured", 503, "AI features are not configured on this site yet.", false);
  const candidates = getCandidateModels(i.model);
  const base = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");

  let lastErr: AiError | null = null;
  for (const model of candidates) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), i.timeoutMs ?? 45_000);
    let res: Response;
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": siteConfig.url,
          "X-Title": siteConfig.name,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: i.system }, { role: "user", content: i.user }],
          max_tokens: i.maxTokens,
          temperature: i.temperature ?? 0.4,
          stream: false,
        }),
      });
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof Error && e.name === "AbortError") {
        lastErr = new AiError("timeout", 504, "The request took too long. Please try again.", true);
      } else {
        lastErr = new AiError("provider_error", 502, "The AI service could not be reached. Please try again.", true);
      }
      continue;
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const s = res.status;
      if (s === 401 || s === 402 || s === 403) {
        throw new AiError("not_configured", 503, "AI features are temporarily unavailable. Please try again later.", false);
      }
      if (s === 400) {
        throw new AiError("bad_request", 422, "Could not process this text. Try shorter or simpler input.", false);
      }
      if (s === 429) {
        lastErr = new AiError("rate_limited", 429, "AI capacity is currently busy. Please wait a moment and try again.", true);
        continue;
      }
      if (s === 404 || s >= 500) {
        lastErr = new AiError("model_unavailable", 503, "AI service is temporarily busy. Please try again shortly.", true);
        continue;
      }
      lastErr = new AiError("provider_error", 502, "The AI service encountered an issue. Please try again.", true);
      continue;
    }

    let data: unknown;
    try { data = await res.json(); } catch {
      lastErr = new AiError("bad_response", 502, "Received an unexpected response. Please try again.", true);
      continue;
    }
    const d = data as { error?: { code?: number }; choices?: { message?: { content?: unknown } }[] };
    if (d.error) {
      lastErr = new AiError(d.error.code === 429 ? "rate_limited" : "provider_error", d.error.code === 429 ? 429 : 502, "AI service is temporarily busy. Please try again.", true);
      continue;
    }
    const text = d.choices?.[0]?.message?.content;
    if (typeof text === "string" && text.trim()) return text.trim();
    lastErr = new AiError("bad_response", 502, "Received an empty response. Please try again.", true);
  }

  throw lastErr ?? new AiError("provider_error", 502, "AI service is temporarily unavailable. Please try again.", true);
}
