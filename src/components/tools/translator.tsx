"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, ChevronDown, Crown, Search } from "lucide-react";
import { LANGUAGES, MAX_CHARS, POPULAR_LANGUAGE_CODES } from "@/lib/ai/limits";
import { AiUsageBar, CopyButton, PrivacyNote, UpgradeProModal, useAi } from "./ai-shared";
import { ErrorMsg, Spinner } from "./ui";

const detectedCode = (name?: string) =>
  LANGUAGES.find((l) => l.name.toLowerCase() === (name ?? "").toLowerCase() || l.name.toLowerCase().startsWith((name ?? "~").toLowerCase()))?.code;

interface LangPickerProps {
  id: string;
  label: string;
  value: string;
  allowAuto?: boolean;
  onChange: (code: string) => void;
}

function LanguagePicker({ id, label, value, allowAuto = false, onChange }: LangPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
    else setQuery("");
  }, [open]);

  const selectedLabel = value === "auto" ? "Detect language" : (LANGUAGES.find((l) => l.code === value)?.name ?? value);

  const { popular, others } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = LANGUAGES.filter((l) => !q || l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q));
    if (q) return { popular: [] as typeof filtered, others: filtered };
    const popSet = new Set<string>(POPULAR_LANGUAGE_CODES);
    return {
      popular: filtered.filter((l) => popSet.has(l.code)),
      others: filtered.filter((l) => !popSet.has(l.code)),
    };
  }, [query]);

  const choose = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={id} className="label">{label}</label>
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between gap-2 text-left"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="pop absolute left-0 right-0 z-40 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          <div className="flex items-center gap-2 border-b border-line bg-surface2 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${LANGUAGES.length}+ languages…`}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto p-1 text-sm">
            {allowAuto && !query.trim() && (
              <li>
                <button type="button" onClick={() => choose("auto")}
                  className={`w-full rounded-lg px-3 py-2 text-left transition ${value === "auto" ? "bg-accent text-onaccent font-medium" : "hover:bg-surface2"}`}>
                  Detect language (Auto)
                </button>
              </li>
            )}
            {popular.length > 0 && (
              <>
                <li className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Popular Languages</li>
                {popular.map((l) => (
                  <li key={l.code}>
                    <button type="button" onClick={() => choose(l.code)}
                      className={`w-full rounded-lg px-3 py-1.5 text-left transition ${value === l.code ? "bg-accent text-onaccent font-medium" : "hover:bg-surface2"}`}>
                      {l.name}
                    </button>
                  </li>
                ))}
                <li className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">All World Languages</li>
              </>
            )}
            {others.map((l) => (
              <li key={l.code}>
                <button type="button" onClick={() => choose(l.code)}
                  className={`w-full rounded-lg px-3 py-1.5 text-left transition ${value === l.code ? "bg-accent text-onaccent font-medium" : "hover:bg-surface2"}`}>
                  {l.name}
                </button>
              </li>
            ))}
            {popular.length === 0 && others.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-muted">No matching language found.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Translator({ defaultSource = "auto", defaultTarget = "hi" }: { defaultSource?: string; defaultTarget?: string } = {}) {
  const [source, setSource] = useState(defaultSource);
  const [target, setTarget] = useState(defaultTarget);
  const [input, setInput] = useState("");
  const { busy, error, result, remaining, limit, upgradeOpen, setUpgradeOpen, run, reset } = useAi("translate");
  const max = MAX_CHARS.translate;
  const over = input.length > max;
  const same = source !== "auto" && source === target;
  const go = () => run(input, { source, target });
  const canSwap = source !== "auto" || !!detectedCode(result?.detected);
  const swap = () => {
    const newTarget = source === "auto" ? detectedCode(result?.detected) : source;
    if (!newTarget) return;
    const prevResult = result?.text;
    setSource(target); setTarget(newTarget); if (prevResult) setInput(prevResult); reset();
  };

  return (
    <div className="space-y-4">
      <AiUsageBar remaining={remaining} limit={limit} onUpgrade={() => setUpgradeOpen(true)} />
      <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <LanguagePicker id="tr-src" label="From" value={source} allowAuto onChange={(v) => { setSource(v); reset(); }} />
        <button type="button" className="btn-ghost sm:mb-0" onClick={swap} disabled={!canSwap || busy} aria-label="Swap languages" title={canSwap ? "Swap languages" : "Translate once with Detect language to enable swapping"}><ArrowLeftRight className="h-4 w-4" aria-hidden="true" /></button>
        <LanguagePicker id="tr-tgt" label="To" value={target} onChange={(v) => { setTarget(v); reset(); }} />
      </div>
      <div>
        <label htmlFor="tr-input" className="label">Text to translate</label>
        <textarea id="tr-input" className="input min-h-[160px] py-3" dir="auto" value={input} placeholder="Type or paste text in any of 130+ languages…" onChange={(e) => { setInput(e.target.value); reset(); }} aria-describedby="tr-count" />
        <p id="tr-count" className={`mt-1 text-xs ${over ? "text-danger" : "text-muted"}`}>{input.length.toLocaleString("en-US")} / {max.toLocaleString("en-US")} characters{over ? ". Too long: please shorten it." : ""}</p>
      </div>
      {same && <ErrorMsg>Choose two different languages.</ErrorMsg>}
      {error && (
        <div>
          <ErrorMsg>{error.msg}</ErrorMsg>
          <div className="mt-2 flex flex-wrap gap-2">
            {error.retry && <button type="button" className="btn-ghost" onClick={go} disabled={busy}>Try again</button>}
            {error.code === "daily_limit_reached" && (
              <button type="button" className="btn-primary !min-h-[38px] text-sm" onClick={() => setUpgradeOpen(true)}>
                <Crown className="h-4 w-4" aria-hidden="true" />Unlock Unlimited Pro
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" disabled={busy || !input.trim() || over || same} onClick={go}>{busy ? <><Spinner />Translating…</> : "Translate"}</button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => { setInput(""); reset(); }}>Clear</button>
      </div>
      <p role="status" aria-live="polite" className="sr-only">{busy ? "Translating" : result ? "Translation ready" : ""}</p>
      {result && (
        <div className="pop rounded-xl border border-l-4 border-accent/30 border-l-accent bg-soft p-4">
          <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-medium">Translation{result.detected ? ` (detected: ${result.detected})` : ""}</p><CopyButton text={result.text} /></div>
          <div className="whitespace-pre-wrap break-words text-base leading-relaxed" dir="auto">{result.text}</div>
          <p className="mt-3 text-xs text-muted">{result.text.length.toLocaleString("en-US")} characters</p>
        </div>
      )}
      <PrivacyNote />
      <UpgradeProModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} defaultTool="Global Translator" />
    </div>
  );
}
