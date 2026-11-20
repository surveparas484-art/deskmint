"use client";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { SearchX } from "lucide-react";
import { categories, tools, type CategoryId } from "@/lib/registry";
import { searchMint } from "@/lib/search";
import { ToolCard } from "./tool-card";

export function Directory({ initialCategory, initialQuery }: { initialCategory: CategoryId | "all"; initialQuery: string }) {
  const [cat, setCat] = useState<CategoryId | "all">(initialCategory);
  const [q, setQ] = useState(initialQuery);
  const [sort, setSort] = useState<"relevance" | "name">("relevance");
  const [showSoon, setShowSoon] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  const first = useRef(true);
  const dq = useDeferredValue(q);

  useEffect(() => { if (location.hash === "#search") input.current?.focus(); }, []);

  // Keep the URL shareable (?category=...&q=...) without triggering a navigation.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const sp = new URLSearchParams();
    if (cat !== "all") sp.set("category", cat);
    if (dq.trim()) sp.set("q", dq.trim());
    const qs = sp.toString();
    window.history.replaceState(null, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
  }, [cat, dq]);

  const list = useMemo(() => {
    let r = searchMint(tools, dq, 200).filter((t) => (cat === "all" || t.category === cat) && (showSoon || t.status === "active"));
    if (sort === "name") r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    else if (!dq.trim()) r = [...r].sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || a.name.localeCompare(b.name));
    return r;
  }, [dq, cat, sort, showSoon]);

  const filtered = cat !== "all" || q.trim() !== "" || !showSoon;
  const clear = () => { setQ(""); setCat("all"); setShowSoon(true); };
  const count = (id: CategoryId) => tools.filter((t) => t.category === id).length;

  return (
    <div>
      <div className="panel grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:p-4">
        <div><label htmlFor="search" className="sr-only">Search tools</label>
          <input ref={input} id="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools, e.g. 'merge' or 'percentage'" className="input !min-h-[48px]" enterKeyHint="search" /></div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div><label htmlFor="sort" className="sr-only">Sort tools</label>
            <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as "relevance" | "name")} className="input !min-h-[48px]"><option value="relevance">Sort: relevance</option><option value="name">Sort: name A–Z</option></select></div>
          <label className="flex min-h-[48px] items-center gap-2 rounded-xl border border-line px-3 text-sm"><input type="checkbox" checked={showSoon} onChange={(e) => setShowSoon(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />Coming soon</label>
        </div>
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="flex gap-2 sm:flex-wrap" role="group" aria-label="Filter by category">
          <button type="button" className={`chip shrink-0 ${cat === "all" ? "chip-on" : ""}`} aria-pressed={cat === "all"} onClick={() => setCat("all")}>All <span className="text-xs text-muted">{tools.length}</span></button>
          {categories.map((c) => (
            <button key={c.id} type="button" className={`chip shrink-0 ${cat === c.id ? "chip-on" : ""}`} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.label} <span className="text-xs text-muted">{count(c.id)}</span></button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted" role="status" aria-live="polite">Showing {list.length} of {tools.length} {tools.length === 1 ? "tool" : "tools"}</p>
        {filtered && <button type="button" onClick={clear} className="text-sm font-medium text-accent hover:underline">Clear filters</button>}
      </div>

      {list.length === 0 ? (
        <div className="panel mt-4 flex flex-col items-center p-10 text-center">
          <SearchX className="h-8 w-8 text-muted" aria-hidden="true" />
          <p className="mt-3 font-display text-lg font-semibold">No tools match your search</p>
          <p className="mt-1 max-w-sm text-sm text-muted">Check the spelling, try a broader word such as "pdf" or "calculator", or clear the filters.</p>
          <button type="button" className="btn-primary mt-5" onClick={clear}>Clear filters</button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{list.map((t) => <ToolCard key={t.id} tool={t} compact />)}</div>
      )}
    </div>
  );
}
