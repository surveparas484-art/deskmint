"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export const PREVIEW_LIMIT = 120;

/** Renders page thumbnails (first PREVIEW_LIMIT pages) with pdf.js; failures only disable previews. */
export function usePageThumbs(bytes: ArrayBuffer | null, pageCount: number) {
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!bytes) return;
    let stop = false;
    setThumbs({}); setNote("");
    (async () => {
      try {
        const { renderThumbnails } = await import("@/lib/pdf-preview");
        await renderThumbnails(bytes, PREVIEW_LIMIT, (p, url) => { if (!stop) setThumbs((t) => ({ ...t, [p]: url })); }, () => stop);
        if (!stop && pageCount > PREVIEW_LIMIT) setNote(`Previews are shown for the first ${PREVIEW_LIMIT} pages. Type page numbers for the rest.`);
      } catch { if (!stop) setNote("Page previews could not be loaded in this browser. You can still select pages by number."); }
    })();
    return () => { stop = true; };
  }, [bytes, pageCount]);
  return { thumbs, note };
}

export function PageGrid({ count, thumbs, selected, onToggle, tone = "accent" }: { count: number; thumbs: Record<number, string>; selected: Set<number>; onToggle: (p: number) => void; tone?: "accent" | "danger" }) {
  const on = tone === "danger" ? "border-danger" : "border-accent";
  const dot = tone === "danger" ? "bg-danger" : "bg-accent";
  return (
    <ul className="grid max-h-[28rem] grid-cols-3 gap-3 overflow-y-auto rounded-xl border border-line bg-surface2 p-3 sm:grid-cols-4 md:grid-cols-5">
      {Array.from({ length: count }, (_, i) => i + 1).map((p) => (
        <li key={p}>
          <button type="button" onClick={() => onToggle(p)} aria-pressed={selected.has(p)} aria-label={`Page ${p}${selected.has(p) ? ", selected" : ""}`}
            className={`relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg border-2 bg-white text-sm text-neutral-600 ${selected.has(p) ? on : "border-line hover:border-accent/60"}`}>
            {thumbs[p] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={thumbs[p]} alt="" className="h-full w-full object-contain" /> : <span>{p}</span>}
            <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-xs text-white">{p}</span>
            {selected.has(p) && <span className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-onaccent ${dot}`}><Check className="h-4 w-4" aria-hidden="true" /></span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
