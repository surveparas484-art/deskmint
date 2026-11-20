"use client";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { activeMint, getCategory, toolUrl } from "@/lib/registry";
import { searchMint } from "@/lib/search";
import { ToolIcon } from "./icons";

export function ToolSearch() {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const dq = useDeferredValue(q);
  const results = useMemo(() => (dq.trim() ? searchMint(activeMint, dq, 6) : []), [dq]);
  const show = open && q.trim().length > 0;

  const go = (i: number) => { const t = results[i]; if (t) router.push(toolUrl(t)); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); results.length ? go(idx) : router.push(`/tools?q=${encodeURIComponent(q)}`); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="relative w-full max-w-xl" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <label htmlFor={id} className="sr-only">Search tools</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          id={id} type="search" role="combobox" aria-expanded={show} aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={show && results.length ? `${id}-opt-${idx}` : undefined}
          value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); setOpen(true); }} onKeyDown={onKey} onFocus={() => setOpen(true)}
          placeholder="What do you want to do today?" autoComplete="off" enterKeyHint="search"
          className="input !min-h-[56px] !rounded-2xl !border-accent/30 !pl-12 shadow-lg shadow-accent/10"
        />
      </div>
      {show && (
        <ul id={`${id}-list`} role="listbox" aria-label="Matching tools" className="pop absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-xl">
          {results.length === 0 && <li role="presentation" className="px-4 py-3 text-sm text-muted">No available tool matches "{q}". <a className="text-accent underline" href={`/tools?q=${encodeURIComponent(q)}`}>See all tools</a></li>}
          {results.map((t, i) => (
            <li key={t.id} id={`${id}-opt-${i}`} role="option" aria-selected={i === idx} onMouseEnter={() => setIdx(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => go(i)}
              className={`flex min-h-[48px] cursor-pointer items-center gap-3 px-4 py-2 ${i === idx ? "bg-accent/10" : ""}`}>
              <ToolIcon name={t.icon} className="h-4 w-4 text-accent" />
              <span className="font-medium">{t.name}</span>
              <span className="ml-auto text-xs text-muted">{getCategory(t.category).label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
