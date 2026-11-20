"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, UploadCloud } from "lucide-react";
import { formatBytes } from "@/lib/files";

export function Dropzone({ id, label, hint, accept, multiple, onFiles }: { id: string; label: string; hint: string; accept: string; multiple?: boolean; onFiles: (f: File[]) => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(Array.from(e.dataTransfer.files)); }}
    >
      <input id={id} type="file" className="peer sr-only" accept={accept} multiple={multiple}
        onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      <label htmlFor={id}
        className={`flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${over ? "border-accent bg-soft" : "border-line bg-surface2 hover:border-accent/60"}`}>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-soft"><UploadCloud className="h-6 w-6 text-accent" aria-hidden="true" /></span>
        <span className="font-semibold">{label}</span>
        <span className="text-sm text-muted">{hint}</span>
        <span className="btn-ghost pointer-events-none mt-1 !min-h-[40px]">Browse files</span>
      </label>
    </div>
  );
}

export interface DownloadItem { url: string; name: string; size: number }

/** Holds generated files as object URLs and revokes them when replaced or on unmount. */
export function useDownloads() {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const urls = useRef<string[]>([]);
  const set = useCallback((list: { blob: Blob; name: string }[]) => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    const next = list.map((x) => ({ url: URL.createObjectURL(x.blob), name: x.name, size: x.blob.size }));
    urls.current = next.map((n) => n.url);
    setItems(next);
  }, []);
  useEffect(() => () => { urls.current.forEach((u) => URL.revokeObjectURL(u)); }, []);
  return [items, set] as const;
}

export function DownloadList({ items, label = "Download" }: { items: DownloadItem[]; label?: string }) {
  return (
    <ul className="space-y-2">
      {items.map((d) => (
        <li key={d.url} className="flex flex-wrap items-center justify-between gap-3">
          <span className="min-w-0 break-all text-sm"><strong>{d.name}</strong> <span className="text-muted">({formatBytes(d.size)})</span></span>
          <a href={d.url} download={d.name} className="btn-primary"><Download className="h-4 w-4" aria-hidden="true" />{label}</a>
        </li>
      ))}
    </ul>
  );
}

export const errText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");
