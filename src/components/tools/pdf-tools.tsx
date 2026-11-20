"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { baseName, formatBytes, formatRanges, limitLabel, parseRanges } from "@/lib/files";
import { MAX_PDF_BYTES, checkPdf, extractPages, mergePdfs, readPdfFile, removePages, rotatePages } from "@/lib/pdf-ops";
import { DownloadList, Dropzone, errText, useDownloads } from "./file-ui";
import { ErrorMsg, ResetButton, Result, Select, Spinner } from "./ui";

export const asBlob = (b: Uint8Array) => new Blob([b as unknown as BlobPart], { type: "application/pdf" });
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Loads one PDF, validates it and reports its page count. */
export function useSinglePdf() {
  const [src, setSrc] = useState<{ file: File; bytes: ArrayBuffer; pageCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pick = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setError(""); setLoading(true);
    try { setSrc({ file, ...(await readPdfFile(file)) }); }
    catch (e) { setSrc(null); setError(errText(e)); }
    finally { setLoading(false); }
  };
  return { src, loading, error, pick, clear: () => { setSrc(null); setError(""); } };
}

export function FileBar({ name, size, pages, onClear }: { name: string; size: number; pages: number; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg p-3">
      <p className="min-w-0 break-all text-sm"><strong>{name}</strong><span className="text-muted"> · {formatBytes(size)} · {pages} {pages === 1 ? "page" : "pages"}</span></p>
      <button type="button" className="btn-ghost shrink-0" onClick={onClear}>Replace file</button>
    </div>
  );
}

export const RangeField = ({ id, value, onChange, label, hint }: { id: string; value: string; onChange: (v: string) => void; label: string; hint: string }) => (
  <div><label htmlFor={id} className="label">{label}</label>
    <input id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. 1-3, 5, 8-10" autoComplete="off" aria-describedby={`${id}-h`} />
    <p id={`${id}-h`} className="mt-1 text-xs text-muted">{hint}</p></div>
);

/* ---------------- Merge ---------------- */
export function MergePdf() {
  const [files, setFiles] = useState<{ id: number; file: File }[]>([]);
  const nid = useRef(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [dl, setDl] = useDownloads();

  const add = async (list: File[]) => {
    setError(""); setDl([]);
    const ok: { id: number; file: File }[] = [], errs: string[] = [];
    for (const f of list) { const e = await checkPdf(f); if (e) errs.push(e); else ok.push({ id: nid.current++, file: f }); }
    if (ok.length) setFiles((x) => [...x, ...ok]);
    if (errs.length) setError(errs.join(" "));
  };
  const move = (i: number, d: number) => { setDl([]); setFiles((x) => { const j = i + d; if (j < 0 || j >= x.length) return x; const c = [...x]; [c[i], c[j]] = [c[j] as typeof c[number], c[i] as typeof c[number]]; return c; }); };
  const total = files.reduce((s, f) => s + f.file.size, 0);

  const run = async () => {
    setError(""); setDl([]);
    if (total > 300 * 1024 * 1024) { setError("The files add up to more than 300 MB, which is too much to merge safely in a browser tab."); return; }
    try {
      const inputs = [];
      for (const f of files) inputs.push({ bytes: await f.file.arrayBuffer(), label: f.file.name });
      setBusy(`Merging ${inputs.length} files…`);
      await tick();
      const out = await mergePdfs(inputs, (n) => setBusy(`Merged ${n} of ${inputs.length} files…`));
      setDl([{ blob: asBlob(out), name: "merged.pdf" }]);
    } catch (e) { setError(errText(e)); } finally { setBusy(""); }
  };

  return (
    <div className="space-y-4">
      <Dropzone id="merge-files" label="Choose PDF files or drop them here" hint={`Add two or more PDFs. Up to ${limitLabel(MAX_PDF_BYTES)} each.`} accept="application/pdf,.pdf" multiple onFiles={add} />
      {files.length > 0 && (
        <div>
          <p className="label">Merge order (top first)</p>
          <ol className="space-y-2">
            {files.map((f, i) => (
              <li key={f.id} className="flex items-center gap-2 rounded-xl border border-line bg-bg p-2 pl-3">
                <span className="w-6 text-sm text-muted">{i + 1}.</span>
                <span className="min-w-0 flex-1 break-all text-sm">{f.file.name} <span className="text-muted">({formatBytes(f.file.size)})</span></span>
                <button type="button" className="btn-ghost !px-2.5" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${f.file.name} up`}><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                <button type="button" className="btn-ghost !px-2.5" disabled={i === files.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${f.file.name} down`}><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                <button type="button" className="btn-ghost !px-2.5" onClick={() => { setDl([]); setFiles((x) => x.filter((y) => y.id !== f.id)); }} aria-label={`Remove ${f.file.name}`}><X className="h-4 w-4" aria-hidden="true" /></button>
              </li>
            ))}
          </ol>
        </div>
      )}
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" disabled={files.length < 2 || !!busy} onClick={run}>{busy ? "Working…" : "Merge PDFs"}</button>
        <ResetButton onClick={() => { setFiles([]); setError(""); setDl([]); }} />
        {files.length === 1 && <span className="text-sm text-muted">Add at least one more PDF.</span>}
      </div>
      <p role="status" aria-live="polite" className="flex min-h-[20px] items-center gap-2 text-sm text-muted">{busy && <Spinner />}{busy}</p>
      {dl.length > 0 && <Result><p className="mb-3 font-medium">Done. Your merged PDF is ready.</p><DownloadList items={dl} /></Result>}
    </div>
  );
}

/* ---------------- Split ---------------- */
export function SplitPdf() {
  const { src, loading, error: loadErr, pick, clear } = useSinglePdf();
  const [text, setText] = useState("");
  const [mode, setMode] = useState("single");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dl, setDl] = useDownloads();

  const run = async () => {
    if (!src) return;
    setError(""); setDl([]);
    const r = parseRanges(text, src.pageCount);
    if (!r.ok) { setError(r.error); return; }
    if (mode === "each" && r.ranges.length > 50) { setError("Please use 50 ranges or fewer when creating separate files."); return; }
    setBusy(true);
    try {
      const base = baseName(src.file.name);
      const jobs = mode === "single"
        ? [{ pages: r.pages, name: `${base}-extracted.pdf` }]
        : r.ranges.map(([a, b]) => ({ pages: Array.from({ length: b - a + 1 }, (_, k) => a + k), name: `${base}-pages-${a === b ? a : `${a}-${b}`}.pdf` }));
      const out: { blob: Blob; name: string }[] = [];
      for (const j of jobs) { out.push({ blob: asBlob(await extractPages(src.bytes, j.pages, src.file.name)), name: j.name }); await tick(); }
      setDl(out);
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {!src ? <Dropzone id="split-file" label="Choose a PDF or drop it here" hint={`One PDF, up to ${limitLabel(MAX_PDF_BYTES)}.`} accept="application/pdf,.pdf" onFiles={pick} />
        : <FileBar name={src.file.name} size={src.file.size} pages={src.pageCount} onClear={() => { clear(); setDl([]); setText(""); }} />}
      {loading && <p role="status" className="text-sm text-muted">Reading PDF…</p>}
      {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      {src && (
        <>
          <RangeField id="split-ranges" label="Pages to extract" value={text} onChange={(v) => { setText(v); setDl([]); }} hint={`Pages 1 to ${src.pageCount}. Use commas and dashes.`} />
          <Select id="split-mode" label="Output" value={mode} onChange={(v) => { setMode(v); setDl([]); }} options={[{ value: "single", label: "One PDF with all selected pages" }, { value: "each", label: "A separate PDF for each range" }]} />
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary" disabled={busy} onClick={run}>{busy ? "Working…" : "Extract pages"}</button><ResetButton onClick={() => { setText(""); setError(""); setDl([]); }} /></div>
          {dl.length > 0 && <Result><p className="mb-3 font-medium">Done. {dl.length} {dl.length === 1 ? "file is" : "files are"} ready.</p><DownloadList items={dl} /></Result>}
        </>
      )}
    </div>
  );
}

/* ---------------- Rotate ---------------- */
export function RotatePdf() {
  const { src, loading, error: loadErr, pick, clear } = useSinglePdf();
  const [scope, setScope] = useState("all");
  const [angle, setAngle] = useState("90");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dl, setDl] = useDownloads();

  const run = async () => {
    if (!src) return;
    setError(""); setDl([]);
    let pages: number[];
    if (scope === "all") pages = Array.from({ length: src.pageCount }, (_, i) => i + 1);
    else { const r = parseRanges(text, src.pageCount); if (!r.ok) { setError(r.error); return; } pages = r.pages; }
    setBusy(true);
    try {
      const out = await rotatePages(src.bytes, pages, Number(angle) as 90 | 180 | 270, src.file.name);
      setDl([{ blob: asBlob(out), name: `${baseName(src.file.name)}-rotated.pdf` }]);
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {!src ? <Dropzone id="rotate-file" label="Choose a PDF or drop it here" hint={`One PDF, up to ${limitLabel(MAX_PDF_BYTES)}.`} accept="application/pdf,.pdf" onFiles={pick} />
        : <FileBar name={src.file.name} size={src.file.size} pages={src.pageCount} onClear={() => { clear(); setDl([]); }} />}
      {loading && <p role="status" className="text-sm text-muted">Reading PDF…</p>}
      {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      {src && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select id="rot-scope" label="Pages" value={scope} onChange={(v) => { setScope(v); setDl([]); }} options={[{ value: "all", label: "All pages" }, { value: "selected", label: "Selected pages" }]} />
            <Select id="rot-angle" label="Rotate clockwise by" value={angle} onChange={(v) => { setAngle(v); setDl([]); }} options={[{ value: "90", label: "90°" }, { value: "180", label: "180°" }, { value: "270", label: "270° (90° anticlockwise)" }]} />
          </div>
          {scope === "selected" && <RangeField id="rot-ranges" label="Pages to rotate" value={text} onChange={(v) => { setText(v); setDl([]); }} hint={`Pages 1 to ${src.pageCount}.`} />}
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <button type="button" className="btn-primary" disabled={busy} onClick={run}>{busy ? "Working…" : "Rotate PDF"}</button>
          {dl.length > 0 && <Result><p className="mb-3 font-medium">Done. The rotation is added to any existing page rotation.</p><DownloadList items={dl} /></Result>}
        </>
      )}
    </div>
  );
}

/* ---------------- Remove pages ---------------- */
const PREVIEW_LIMIT = 120;

export function RemovePdfPages() {
  const { src, loading, error: loadErr, pick, clear } = useSinglePdf();
  const [text, setText] = useState("");
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [previewNote, setPreviewNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dl, setDl] = useDownloads();

  useEffect(() => {
    if (!src) return;
    let stop = false;
    setThumbs({}); setPreviewNote("");
    (async () => {
      try {
        const { renderThumbnails } = await import("@/lib/pdf-preview");
        await renderThumbnails(src.bytes, PREVIEW_LIMIT, (p, url) => { if (!stop) setThumbs((t) => ({ ...t, [p]: url })); }, () => stop);
        if (!stop && src.pageCount > PREVIEW_LIMIT) setPreviewNote(`Previews are shown for the first ${PREVIEW_LIMIT} pages. Type page numbers below for the rest.`);
      } catch {
        if (!stop) setPreviewNote("Page previews could not be loaded in this browser. You can still select pages by number.");
      }
    })();
    return () => { stop = true; };
  }, [src]);

  const parsed = src ? parseRanges(text, src.pageCount) : null;
  const selected = new Set(parsed && parsed.ok ? parsed.pages : []);
  const toggle = (p: number) => { const s = new Set(selected); if (s.has(p)) s.delete(p); else s.add(p); setText(formatRanges([...s])); setDl([]); setError(""); };

  const run = async () => {
    if (!src) return;
    setError(""); setDl([]);
    if (!parsed || !parsed.ok) { setError(parsed ? parsed.error : "Select pages to remove."); return; }
    setBusy(true);
    try {
      const out = await removePages(src.bytes, parsed.pages, src.file.name);
      setDl([{ blob: asBlob(out), name: `${baseName(src.file.name)}-edited.pdf` }]);
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {!src ? <Dropzone id="remove-file" label="Choose a PDF or drop it here" hint={`One PDF, up to ${limitLabel(MAX_PDF_BYTES)}.`} accept="application/pdf,.pdf" onFiles={pick} />
        : <FileBar name={src.file.name} size={src.file.size} pages={src.pageCount} onClear={() => { clear(); setDl([]); setText(""); }} />}
      {loading && <p role="status" className="text-sm text-muted">Reading PDF…</p>}
      {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      {src && (
        <>
          <div>
            <p className="label">Tap pages to mark them for removal</p>
            <ul className="grid max-h-[28rem] grid-cols-3 gap-3 overflow-y-auto rounded-xl border border-line bg-bg p-3 sm:grid-cols-4 md:grid-cols-5">
              {Array.from({ length: src.pageCount }, (_, i) => i + 1).map((p) => (
                <li key={p}>
                  <button type="button" onClick={() => toggle(p)} aria-pressed={selected.has(p)} aria-label={`Page ${p}${selected.has(p) ? ", marked for removal" : ""}`}
                    className={`relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-lg border-2 bg-white text-sm text-neutral-600 ${selected.has(p) ? "border-danger" : "border-line hover:border-accent/60"}`}>
                    {thumbs[p] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={thumbs[p]} alt="" className="h-full w-full object-contain" /> : <span>{p}</span>}
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-xs text-white">{p}</span>
                    {selected.has(p) && <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-onaccent"><Check className="h-4 w-4" aria-hidden="true" /></span>}
                  </button>
                </li>
              ))}
            </ul>
            {previewNote && <p className="mt-2 text-xs text-muted">{previewNote}</p>}
          </div>
          <RangeField id="rm-ranges" label="Pages to remove" value={text} onChange={(v) => { setText(v); setDl([]); }} hint={`Pages 1 to ${src.pageCount}. This stays in sync with the page selection above.`} />
          {text.trim() && parsed && !parsed.ok && <ErrorMsg>{parsed.error}</ErrorMsg>}
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" disabled={busy || !parsed || !parsed.ok} onClick={run}>{busy ? "Working…" : `Remove ${selected.size || ""} ${selected.size === 1 ? "page" : "pages"}`.replace("  ", " ")}</button>
            <ResetButton onClick={() => { setText(""); setError(""); setDl([]); }} />
          </div>
          {dl.length > 0 && <Result><p className="mb-3 font-medium">Done. The edited PDF is ready.</p><DownloadList items={dl} /></Result>}
        </>
      )}
    </div>
  );
}
