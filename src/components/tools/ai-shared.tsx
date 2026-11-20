"use client";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Copy, Crown, Lock, X } from "lucide-react";
import { AiClientError, callAi, type AiResult } from "@/lib/ai/client";
import { DAILY_FREE_AI_LIMIT, MAX_CHARS, type AiTask } from "@/lib/ai/limits";
import { ErrorMsg, Spinner } from "./ui";

const QUOTA_KEY = "deskmint_ai_quota_v1";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function readStoredRemaining(): number {
  if (typeof window === "undefined") return DAILY_FREE_AI_LIMIT;
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if (!raw) return DAILY_FREE_AI_LIMIT;
    const parsed = JSON.parse(raw) as { day?: string; remaining?: number };
    if (parsed.day !== todayKey() || typeof parsed.remaining !== "number") return DAILY_FREE_AI_LIMIT;
    return Math.max(0, Math.min(DAILY_FREE_AI_LIMIT, parsed.remaining));
  } catch {
    return DAILY_FREE_AI_LIMIT;
  }
}

function writeStoredRemaining(remaining: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify({ day: todayKey(), remaining }));
  } catch { /* ignore storage errors */ }
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [s, setS] = useState<"idle" | "ok" | "fail">("idle");
  const copy = async () => { try { await navigator.clipboard.writeText(text); setS("ok"); } catch { setS("fail"); } setTimeout(() => setS("idle"), 1800); };
  return <button type="button" onClick={copy} className="btn-ghost !min-h-[36px] !px-3 text-xs"><Copy className="h-3.5 w-3.5" aria-hidden="true" />{s === "ok" ? "Copied" : s === "fail" ? "Copy not available" : label}</button>;
}

export const PrivacyNote = () => (
  <p className="flex items-center gap-1.5 text-xs text-muted">
    <Lock className="h-3.5 w-3.5 shrink-0 text-ok" aria-hidden="true" />
    <span>Privacy-First Processing: Your text is processed securely in real time and is never stored by DeskMint.</span>
  </p>
);

export function UpgradeProModal({ open, onClose, defaultTool }: { open: boolean; onClose: () => void; defaultTool?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tools, setMint] = useState(defaultTool || "AI Studio & Global Translator");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [doneMsg, setDoneMsg] = useState("");

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/upgrade-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, tools }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) {
        setErr(data.error || "Could not submit your request. Please check your details.");
      } else {
        setDoneMsg(data.message || "Request received! We will email your activation details shortly.");
      }
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pro-modal-title">
      <div className="pop relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        <button type="button" onClick={onClose} aria-label="Close modal" className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-fg">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {doneMsg ? (
          <div className="space-y-4 py-2 text-center">
            <CheckCircle2 className="mx-auto h-11 w-11 text-ok" aria-hidden="true" />
            <h2 id="pro-modal-title" className="text-xl font-bold">Request Received!</h2>
            <p className="text-sm text-muted">{doneMsg}</p>
            <button type="button" onClick={onClose} className="btn-primary w-full">Back to DeskMint</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Crown className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="pro-modal-title" className="text-lg font-bold">Upgrade to DeskMint Pro</h2>
                <p className="text-xs text-muted">Unlock unlimited AI Studio & Global Translator access</p>
              </div>
            </div>

            <p className="rounded-xl border border-line bg-surface2 px-3 py-2 text-xs text-muted">
              Free visitors get {DAILY_FREE_AI_LIMIT} AI requests per day (all PDF, Image & Calculator tools remain 100% unlimited). Leave your details below and we will email you quick UPI/QR activation details.
            </p>

            <div>
              <label htmlFor="pro-name" className="label">Full Name *</label>
              <input id="pro-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label htmlFor="pro-email" className="label">Email Address *</label>
              <input id="pro-email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="pro-phone" className="label">WhatsApp / Phone (optional)</label>
              <input id="pro-phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label htmlFor="pro-tools" className="label">Which tools do you use most?</label>
              <input id="pro-tools" className="input" value={tools} onChange={(e) => setMint(e.target.value)} placeholder="e.g. AI Email Writer, Translator, PDF Summarizer" />
            </div>

            {err && <ErrorMsg>{err}</ErrorMsg>}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? <><Spinner />Sending request…</> : "Request Pro Access"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function AiUsageBar({ remaining, limit, onUpgrade }: { remaining: number; limit: number; onUpgrade: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface2 px-3.5 py-2 text-xs">
      <span className={remaining === 0 ? "font-semibold text-danger" : "text-muted"}>
        {remaining > 0 ? `${remaining} of ${limit} free AI uses left today` : `0 of ${limit} free AI uses left today`}
      </span>
      <button type="button" onClick={onUpgrade} className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
        <Crown className="h-3.5 w-3.5" aria-hidden="true" />
        Upgrade to Pro
      </button>
    </div>
  );
}

/** Runs an AI task and tracks loading / error / result / daily quota state. */
export function useAi(task: AiTask) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; retry: boolean; code?: string } | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);
  const [remaining, setRemaining] = useState(DAILY_FREE_AI_LIMIT);
  const [limit, setLimit] = useState(DAILY_FREE_AI_LIMIT);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    setRemaining(readStoredRemaining());
  }, []);

  const run = async (input: string, options: Record<string, unknown> = {}) => {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await callAi(task, input, options);
      setResult(res);
      if (typeof res.remaining === "number") {
        setRemaining(res.remaining);
        writeStoredRemaining(res.remaining);
      }
      if (typeof res.limit === "number") setLimit(res.limit);
    } catch (e) {
      const isClient = e instanceof AiClientError;
      const code = isClient ? e.code : undefined;
      if (code === "daily_limit_reached") {
        setRemaining(0);
        writeStoredRemaining(0);
        setUpgradeOpen(true);
      }
      setError({
        msg: isClient ? e.message : "Something went wrong. Please try again.",
        retry: isClient ? e.retryable : true,
        code,
      });
    } finally { setBusy(false); }
  };

  return {
    busy, error, result, remaining, limit, upgradeOpen, setUpgradeOpen, run,
    reset: () => { setError(null); setResult(null); },
  };
}

export function AiTextTool({ task, label, placeholder, example, button, options = null, buildOptions, render, helper }: {
  task: AiTask; label: string; placeholder: string; example: string; button: string;
  options?: ReactNode; buildOptions?: () => Record<string, unknown>; render?: (r: AiResult, ctx: { rerun: (extra?: Record<string, unknown>) => void; busy: boolean }) => ReactNode; helper?: string;
}) {
  const [input, setInput] = useState("");
  const { busy, error, result, remaining, limit, upgradeOpen, setUpgradeOpen, run, reset } = useAi(task);
  const max = MAX_CHARS[task];
  const over = input.length > max;
  const go = (extra: Record<string, unknown> = {}) => run(input, { ...(buildOptions?.() ?? {}), ...extra });

  return (
    <div className="space-y-4">
      <AiUsageBar remaining={remaining} limit={limit} onUpgrade={() => setUpgradeOpen(true)} />
      <div>
        <div className="flex items-end justify-between gap-3"><label htmlFor={`ai-${task}`} className="label !mb-0">{label}</label>
          <button type="button" className="text-xs font-medium text-accent hover:underline" onClick={() => { setInput(example); reset(); }}>Try an example</button></div>
        <textarea id={`ai-${task}`} className="input mt-1.5 min-h-[180px] py-3" value={input} placeholder={placeholder} onChange={(e) => { setInput(e.target.value); reset(); }} aria-describedby={`ai-${task}-count`} />
        <p id={`ai-${task}-count`} className={`mt-1 text-xs ${over ? "text-danger" : "text-muted"}`}>{input.length.toLocaleString("en-US")} / {max.toLocaleString("en-US")} characters{over ? ". Too long: please shorten it." : helper ? `. ${helper}` : ""}</p>
      </div>
      {options}
      {error && (
        <div>
          <ErrorMsg>{error.msg}</ErrorMsg>
          <div className="mt-2 flex flex-wrap gap-2">
            {error.retry && <button type="button" className="btn-ghost" onClick={() => go()} disabled={busy}>Try again</button>}
            {error.code === "daily_limit_reached" && (
              <button type="button" className="btn-primary !min-h-[38px] text-sm" onClick={() => setUpgradeOpen(true)}>
                <Crown className="h-4 w-4" aria-hidden="true" />Unlock Unlimited Pro
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" disabled={busy || !input.trim() || over} onClick={() => go()}>{busy ? <><Spinner />Working…</> : button}</button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => { setInput(""); reset(); }}>Clear</button>
      </div>
      <p role="status" aria-live="polite" className="sr-only">{busy ? "Generating result" : result ? "Result ready" : ""}</p>
      {result && (render ? render(result, { rerun: (extra) => go(extra), busy }) : (
        <div className="pop rounded-xl border border-l-4 border-accent/30 border-l-accent bg-soft p-4">
          <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-medium">Result</p><CopyButton text={result.text} /></div>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed" dir="auto">{result.text}</div>
        </div>))}
      <PrivacyNote />
      <UpgradeProModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
