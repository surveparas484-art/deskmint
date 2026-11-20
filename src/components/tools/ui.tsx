"use client";
import { useState, type ReactNode } from "react";

const NUM = /^[+-]?(\d+\.?\d*|\.\d+)$/;
/** Returns NaN for empty or non-numeric text. */
export const parseNum = (s: string) => (NUM.test(s.trim()) ? Number(s) : NaN);
export const fmt = (n: number, d = 4) => Number(n.toFixed(d)).toLocaleString("en-US", { maximumFractionDigits: d });

export function NumInput({ id, label, value, onChange, hint, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} className="input" type="text" inputMode="decimal" autoComplete="off" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-h` : undefined} />
      {hint && <p id={`${id}-h`} className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function DateInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (<div><label htmlFor={id} className="label">{label}</label><input id={id} type="date" className="input" value={value} onChange={(e) => onChange(e.target.value)} /></div>);
}

export function Select({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div><label htmlFor={id} className="label">{label}</label>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
  );
}

export function ErrorMsg({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-xl border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger"><strong>Error: </strong>{children}</p>;
}

export function Result({ children, copyText }: { children: ReactNode; copyText?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try { await navigator.clipboard.writeText(copyText ?? ""); setState("copied"); }
    catch { setState("failed"); }
    setTimeout(() => setState("idle"), 1800);
  };
  return (
    <div role="status" aria-live="polite" className="pop rounded-xl border border-l-4 border-accent/30 border-l-accent bg-soft p-4">
      {children}
      {copyText && <div className="mt-3"><button type="button" onClick={copy} className="btn-ghost !min-h-[36px] !px-3 text-xs">{state === "copied" ? "Copied" : state === "failed" ? "Copy not available" : "Copy result"}</button></div>}
    </div>
  );
}

export function Spinner() {
  return <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />;
}

export function Big({ label, value }: { label: string; value: string }) {
  return (<div><p className="text-sm text-muted">{label}</p><p className="font-display text-2xl font-bold sm:text-3xl">{value}</p></div>);
}

export function Formula({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm text-muted"><span className="font-medium text-fg">Formula: </span>{children}</p>;
}

export function ResetButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="btn-ghost">Reset</button>;
}
