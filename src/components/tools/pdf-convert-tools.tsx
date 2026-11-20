"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, X } from "lucide-react";
import { baseName, formatBytes, limitLabel, parseRanges, type LayoutOptions } from "@/lib/files";
import { MAX_IMAGE_BYTES, checkDims, checkImage, encodeImage, loadImage } from "@/lib/image-utils";
import { MAX_PDF_BYTES, buildImagePdf, buildPdfFromJpegs, optimizePdf, type ImagePdfItem, type PageImage } from "@/lib/pdf-ops";
import { createZip } from "@/lib/zip";
import { DownloadList, Dropzone, errText, useDownloads } from "./file-ui";
import { FileBar, RangeField, asBlob, useSinglePdf } from "./pdf-tools";
import { ErrorMsg, ResetButton, Result, Select, Spinner } from "./ui";

const Progress = ({ text }: { text: string }) => (
  <p role="status" aria-live="polite" className="flex min-h-[20px] items-center gap-2 text-sm text-muted">{text && <Spinner />}{text}</p>
);
const allPages = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const MAX_RENDER_PAGES = 100;

/* ---------------- Compress PDF ---------------- */
const PRESETS: Record<string, { label: string; dpi: number; q: number }> = {
  strong: { label: "Strong: smallest file, lower sharpness (100 DPI, 60% quality)", dpi: 100, q: 0.6 },
  balanced: { label: "Balanced (130 DPI, 70% quality)", dpi: 130, q: 0.7 },
  light: { label: "Light: sharper, larger file (170 DPI, 80% quality)", dpi: 170, q: 0.8 },
};

const MIN_TARGET = 20 * 1024; // 20 KB
const UNIT = { KB: 1024, MB: 1024 * 1024 } as const;
type Unit = keyof typeof UNIT;
const PDF_TARGET_PRESETS_KB = [50, 100, 200, 500, 1024] as const;

const bytesToInput = (b: number, u: Unit) => (u === "KB" ? String(Math.round(b / 1024)) : String(Number((b / UNIT.MB).toFixed(2))));
const posToBytes = (pos: number, max: number) => Math.round(MIN_TARGET * Math.pow(max / MIN_TARGET, pos / 1000));
const bytesToPos = (b: number, max: number) => Math.round((1000 * Math.log(Math.max(b, MIN_TARGET) / MIN_TARGET)) / Math.log(max / MIN_TARGET));

export function CompressPdf({ defaultTargetKb }: { defaultTargetKb?: number } = {}) {
  const { src, loading, error: loadErr, pick, clear } = useSinglePdf();
  const [mode, setMode] = useState(defaultTargetKb ? "target" : "auto");
  const [preset, setPreset] = useState("balanced");
  const [strip, setStrip] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [dl, setDl] = useDownloads();
  const [ran, setRan] = useState<"auto" | "images" | "optimize" | null>(null);
  const [autoNote, setAutoNote] = useState("");
  const [bloated, setBloated] = useState(false);
  const [targetBytes, setTargetBytes] = useState(defaultTargetKb ? defaultTargetKb * 1024 : 0);
  const [unit, setUnit] = useState<Unit>(defaultTargetKb && defaultTargetKb >= 1024 ? "MB" : "KB");
  const [targetText, setTargetText] = useState(defaultTargetKb ? String(defaultTargetKb >= 1024 ? Number((defaultTargetKb / 1024).toFixed(2)) : defaultTargetKb) : "");
  const [targetErr, setTargetErr] = useState("");
  const [allowRaster, setAllowRaster] = useState(true);
  const [tr, setTr] = useState<import("@/lib/pdf-compress").TargetResult | null>(null);
  const cancel = useRef(false);

  const maxTarget = src ? src.file.size : 0;
  const targetOk = !!src && maxTarget > MIN_TARGET * 1.1;

  useEffect(() => {
    if (!src) return;
    const desired = defaultTargetKb ? defaultTargetKb * 1024 : Math.round(src.file.size * 0.5);
    const t = Math.min(src.file.size, Math.max(MIN_TARGET, desired));
    const u: Unit = t >= UNIT.MB ? "MB" : "KB";
    setUnit(u);
    setTargetBytes(t);
    setTargetText(bytesToInput(t, u));
    setTargetErr("");
    setTr(null);
    setBloated(false);
    setAutoNote("");
  }, [src, defaultTargetKb]);

  const clearResults = () => { setDl([]); setRan(null); setTr(null); setBloated(false); setAutoNote(""); };
  const applyPresetKb = (kb: number) => {
    if (!src) return;
    const b = kb * 1024;
    const u: Unit = kb >= 1024 ? "MB" : "KB";
    setUnit(u);
    setTargetBytes(b);
    setTargetText(bytesToInput(b, u));
    setTargetErr("");
    clearResults();
  };
  const onSlider = (pos: number) => {
    const b = posToBytes(pos, maxTarget);
    setTargetBytes(b);
    setTargetText(bytesToInput(b, unit));
    setTargetErr("");
    clearResults();
  };
  const onTargetText = (v: string) => {
    setTargetText(v);
    clearResults();
    const n = Number(v);
    if (v.trim() === "" || !Number.isFinite(n) || n <= 0) { setTargetErr("Enter a size greater than zero."); return; }
    const b = Math.round(n * UNIT[unit]);
    if (b < MIN_TARGET) { setTargetErr(`Minimum target size is ${formatBytes(MIN_TARGET)}.`); return; }
    setTargetErr("");
    setTargetBytes(b);
  };
  const onUnit = (u: Unit) => { setUnit(u); setTargetText(bytesToInput(targetBytes, u)); setTargetErr(""); clearResults(); };

  const run = async () => {
    if (!src) return;
    setError(""); clearResults(); cancel.current = false;
    try {
      if (mode === "target") {
        if (targetErr || !targetBytes) { setError(targetErr || "Choose a target size."); return; }
        setProgress("Analysing PDF…");
        const { compressToTarget } = await import("@/lib/pdf-compress");
        const r = await compressToTarget(src.bytes, targetBytes, src.file.name, { allowRaster, onProgress: setProgress, cancelled: () => cancel.current });
        setTr(r);
        if (r.bytes && r.size < src.file.size) {
          setDl([{ blob: asBlob(r.bytes), name: `${baseName(src.file.name)}-compressed.pdf` }]);
        }
        return;
      }

      if (mode === "auto") {
        setProgress("Analysing PDF structure…");
        const { analyzePdf, compressToTarget } = await import("@/lib/pdf-compress");
        const info = await analyzePdf(src.bytes, src.file.name);
        let bestOut: Uint8Array | null = null;
        let note = "";

        setProgress("Testing lossless structure optimisation…");
        const structOut = await optimizePdf(src.bytes, src.file.name, true);
        if (structOut.length < src.file.size) {
          bestOut = structOut;
          note = "Optimised PDF structure while keeping all text crisp and selectable.";
        }

        if (info.jpegImages > 0 && info.imageShare > 0.15) {
          setProgress("Compressing embedded images while preserving text…");
          const imgTarget = Math.max(MIN_TARGET, Math.round(src.file.size * 0.6));
          const r = await compressToTarget(src.bytes, imgTarget, src.file.name, { allowRaster: false, onProgress: setProgress, cancelled: () => cancel.current });
          if (r.bytes && r.size < (bestOut ? bestOut.length : src.file.size)) {
            bestOut = r.bytes;
            note = "Compressed embedded images while keeping all text selectable.";
          }
        }

        setRan("auto");
        if (bestOut && bestOut.length < src.file.size) {
          setAutoNote(note);
          setDl([{ blob: asBlob(bestOut), name: `${baseName(src.file.name)}-compressed.pdf` }]);
        } else {
          setBloated(true);
          setAutoNote(
            info.jpegImages === 0
              ? "This PDF is mostly lightweight text/vectors and is already optimally compressed. Keeping your original file prevents unnecessary size bloat."
              : "This PDF is already optimally compressed at readable quality. Keeping your original file is the smallest option."
          );
        }
        return;
      }

      let out: Uint8Array;
      if (mode === "optimize") {
        setProgress("Optimising file structure…");
        out = await optimizePdf(src.bytes, src.file.name, strip);
      } else {
        if (src.pageCount > MAX_RENDER_PAGES) throw new Error(`This method supports up to ${MAX_RENDER_PAGES} pages. Your file has ${src.pageCount}. Try "Smart Auto" or split the PDF first.`);
        const p = PRESETS[preset] as { dpi: number; q: number };
        const { renderJpegPages } = await import("@/lib/pdf-preview");
        const pages: PageImage[] = [];
        await renderJpegPages(src.bytes, allPages(src.pageCount), p.dpi, p.q, async (pg) => {
          pages.push({ jpeg: new Uint8Array(await pg.blob.arrayBuffer()), widthPt: pg.widthPt, heightPt: pg.heightPt });
          setProgress(`Compressing page ${pg.page} of ${src.pageCount}…`);
        }, () => false);
        setProgress("Building PDF…");
        out = await buildPdfFromJpegs(pages);
      }
      setRan(mode === "optimize" ? "optimize" : "images");
      if (out.length < src.file.size) {
        setDl([{ blob: asBlob(out), name: `${baseName(src.file.name)}-compressed.pdf` }]);
      } else {
        setBloated(true);
      }
    } catch (e) { setError(errText(e)); } finally { setProgress(""); }
  };

  const out = dl[0];
  const smaller = !!src && !!out && out.size < src.file.size;
  const diff = src && out ? ((out.size - src.file.size) / src.file.size) * 100 : 0;
  const pct = src && tr && tr.bytes ? (1 - tr.size / src.file.size) * 100 : 0;

  return (
    <div className="space-y-4">
      {!src ? <Dropzone id="compress-file" label="Choose a PDF or drop it here" hint={`One PDF, up to ${limitLabel(MAX_PDF_BYTES)}.`} accept="application/pdf,.pdf" onFiles={pick} />
        : <FileBar name={src.file.name} size={src.file.size} pages={src.pageCount} onClear={() => { clear(); clearResults(); }} />}
      {loading && <p role="status" className="text-sm text-muted">Reading PDF…</p>}
      {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      {src && (
        <>
          <Select id="comp-mode" label="Compression Method" value={mode} onChange={(v) => { setMode(v); clearResults(); }}
            options={[
              { value: "auto", label: "Smart Auto (Recommended — preserves text, never increases file size)" },
              { value: "target", label: "Custom Target Size (KB / MB) — aim for an exact file size limit" },
              { value: "optimize", label: "Optimise structure only (lossless, keeps text selectable)" },
              { value: "images", label: "Compress pages as images (for heavy scanned PDFs only)" },
            ]} />
          {mode === "auto" && (
            <p className="text-xs text-muted">Automatically detects whether your PDF is text-based or image-heavy, applies the best text-preserving compression, and guarantees the output is never larger than your original file.</p>
          )}
          {mode === "images" && (
            <>
              <Select id="comp-preset" label="Compression level" value={preset} onChange={(v) => { setPreset(v); clearResults(); }} options={Object.entries(PRESETS).map(([k, v]) => ({ value: k, label: v.label }))} />
              <p className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm"><strong>Note:</strong> Best for scanned documents. Every page becomes an image so text will no longer be selectable. If the result is larger than your original, we will stop automatically and protect your file size.</p>
            </>
          )}
          {mode === "optimize" && (
            <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={strip} onChange={(e) => { setStrip(e.target.checked); clearResults(); }} />Also remove title, author and keyword metadata</label>
          )}
          {mode === "target" && (
            targetOk ? (
              <div className="space-y-4 rounded-xl border border-line bg-surface2 p-4">
                <p className="text-sm">Original size: <strong>{formatBytes(src.file.size)}</strong> · Target limit: <strong>{formatBytes(targetBytes)}</strong></p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Quick target sizes">
                  {PDF_TARGET_PRESETS_KB.map((kb) => (
                    <button key={kb} type="button" onClick={() => applyPresetKb(kb)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${Math.abs(targetBytes - kb * 1024) < 1024 ? "border-accent bg-accent text-onaccent" : "border-line bg-surface hover:border-accent/50"}`}>
                      {kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`}
                    </button>
                  ))}
                </div>
                <div>
                  <label htmlFor="tgt-slider" className="label">Target size (slider)</label>
                  <input id="tgt-slider" type="range" min={0} max={1000} step={1} value={bytesToPos(Math.min(targetBytes, maxTarget), maxTarget)} onChange={(e) => onSlider(Number(e.target.value))} className="h-11 w-full accent-[rgb(var(--accent))]" aria-valuetext={formatBytes(targetBytes)} />
                  <div className="flex justify-between text-xs text-muted"><span>{formatBytes(MIN_TARGET)}</span><span>{formatBytes(maxTarget)}</span></div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div><label htmlFor="tgt-input" className="label">Target size (type exact value)</label>
                    <input id="tgt-input" className="input" type="text" inputMode="decimal" value={targetText} onChange={(e) => onTargetText(e.target.value)} aria-invalid={!!targetErr} aria-describedby="tgt-err" /></div>
                  <Select id="tgt-unit" label="Unit" value={unit} onChange={(v) => onUnit(v as Unit)} options={[{ value: "KB", label: "KB" }, { value: "MB", label: "MB" }]} />
                </div>
                <p id="tgt-err" className="min-h-[18px] text-xs text-danger">{targetErr}</p>
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" checked={allowRaster} onChange={(e) => { setAllowRaster(e.target.checked); clearResults(); }} /><span>Allow converting pages to compressed images if needed to reach the target size (up to 50 pages). <strong>Text will not be selectable if used.</strong></span></label>
              </div>
            ) : <p className="rounded-xl border border-line bg-surface2 px-3 py-2 text-sm">Your PDF is already very small ({formatBytes(src.file.size)}). It is already below the minimum compression threshold ({formatBytes(MIN_TARGET)}).</p>
          )}
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary" disabled={!!progress || (mode === "target" && (!targetOk || !!targetErr))} onClick={run}>{progress ? "Working…" : "Compress PDF"}</button>
            {progress && mode === "target" && <button type="button" className="btn-ghost" onClick={() => { cancel.current = true; }}>Stop and use best so far</button>}
            <ResetButton onClick={() => { clearResults(); setError(""); }} />
          </div>
          <Progress text={progress} />
          {mode === "target" && tr && (
            <Result>
              {tr.alreadyUnder ? (
                <p className="font-medium">Already under target: your PDF ({formatBytes(src.file.size)}) is already smaller than {formatBytes(targetBytes)}. No compression needed!</p>
              ) : (
                <>
                  <p className="font-medium">
                    {!tr.bytes ? `Already optimally compressed (${formatBytes(src.file.size)}). ${tr.reason}`
                      : tr.met ? `Target met: ${formatBytes(tr.size)} is under your ${formatBytes(targetBytes)} limit.`
                        : `Reached the smallest readable size (${formatBytes(tr.size)}) achievable for this document.`}
                  </p>
                  {tr.bytes && (
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div><dt className="text-muted">Original</dt><dd className="font-semibold">{formatBytes(src.file.size)}</dd></div>
                      <div><dt className="text-muted">Target</dt><dd className="font-semibold">{formatBytes(targetBytes)}</dd></div>
                      <div><dt className="text-muted">Result</dt><dd className="font-semibold">{formatBytes(tr.size)}</dd></div>
                      <div><dt className="text-muted">Saved</dt><dd className="font-semibold">{pct.toFixed(1)}%</dd></div>
                    </dl>
                  )}
                  <p className="mt-3 text-sm text-muted">{tr.reason}{tr.bytes && tr.textPreserved ? " Text stays selectable." : ""}</p>
                  {tr.bytes && <div className="mt-4"><DownloadList items={dl} /></div>}
                </>
              )}
            </Result>
          )}
          {mode !== "target" && (out || bloated) && (
            <Result>
              {smaller && out ? (
                <>
                  <p className="font-medium">Smaller by {Math.abs(diff).toFixed(1)}%: {formatBytes(src.file.size)} → {formatBytes(out.size)}</p>
                  {autoNote && <p className="mt-1 text-sm text-muted">{autoNote}</p>}
                  <div className="mt-4"><DownloadList items={dl} label="Download compressed PDF" /></div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <p className="font-medium">Already optimally compressed ({formatBytes(src.file.size)})</p>
                  <p className="text-sm text-muted">{autoNote || (ran === "images" ? "Converting pages to images would make this lightweight PDF larger than the original. Keep your original file—it is already smaller." : "This PDF is already optimised and cannot be reduced further without losing quality. Your original file is already the smallest version.")}</p>
                </div>
              )}
            </Result>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- PDF to JPG ---------------- */
export function PdfToJpg() {
  const { src, loading, error: loadErr, pick, clear } = useSinglePdf();
  const [scope, setScope] = useState("all");
  const [text, setText] = useState("");
  const [dpi, setDpi] = useState("150");
  const [quality, setQuality] = useState("0.85");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [imgs, setImgs] = useDownloads();
  const [zip, setZip] = useDownloads();
  const [dims, setDims] = useState<Record<string, string>>({});

  const reset = () => { setImgs([]); setZip([]); setDims({}); };

  const run = async () => {
    if (!src) return;
    setError(""); reset();
    let pages: number[];
    if (scope === "all") pages = allPages(src.pageCount);
    else { const r = parseRanges(text, src.pageCount); if (!r.ok) { setError(r.error); return; } pages = r.pages; }
    if (pages.length > MAX_RENDER_PAGES) { setError(`Please convert up to ${MAX_RENDER_PAGES} pages at a time. You selected ${pages.length}.`); return; }
    try {
      const { renderJpegPages } = await import("@/lib/pdf-preview");
      const base = baseName(src.file.name);
      const out: { blob: Blob; name: string }[] = [];
      const d: Record<string, string> = {};
      await renderJpegPages(src.bytes, pages, Number(dpi), Number(quality), (pg) => {
        const name = `${base}-page-${pg.page}.jpg`;
        out.push({ blob: pg.blob, name }); d[name] = `${pg.widthPx}×${pg.heightPx}px`;
        setProgress(`Converting page ${out.length} of ${pages.length}…`);
      }, () => false);
      setImgs(out); setDims(d);
      if (out.length > 1) {
        setProgress("Creating ZIP…");
        const files = await Promise.all(out.map(async (o) => ({ name: o.name, data: new Uint8Array(await o.blob.arrayBuffer()) })));
        setZip([{ blob: new Blob([createZip(files) as unknown as BlobPart], { type: "application/zip" }), name: `${base}-jpg-pages.zip` }]);
      }
    } catch (e) { setError(errText(e)); } finally { setProgress(""); }
  };

  return (
    <div className="space-y-4">
      {!src ? <Dropzone id="p2j-file" label="Choose a PDF or drop it here" hint={`One PDF, up to ${limitLabel(MAX_PDF_BYTES)}.`} accept="application/pdf,.pdf" onFiles={pick} />
        : <FileBar name={src.file.name} size={src.file.size} pages={src.pageCount} onClear={() => { clear(); reset(); setText(""); }} />}
      {loading && <p role="status" className="text-sm text-muted">Reading PDF…</p>}
      {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      {src && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select id="p2j-scope" label="Pages" value={scope} onChange={(v) => { setScope(v); reset(); }} options={[{ value: "all", label: "All pages" }, { value: "selected", label: "Selected pages" }]} />
            <Select id="p2j-dpi" label="Resolution" value={dpi} onChange={(v) => { setDpi(v); reset(); }} options={[{ value: "72", label: "72 DPI (screen)" }, { value: "100", label: "100 DPI" }, { value: "150", label: "150 DPI (default)" }, { value: "200", label: "200 DPI (print)" }, { value: "300", label: "300 DPI (large files)" }]} />
            <Select id="p2j-q" label="JPG quality" value={quality} onChange={(v) => { setQuality(v); reset(); }} options={[{ value: "0.7", label: "Good (70%)" }, { value: "0.85", label: "High (85%)" }, { value: "0.95", label: "Maximum (95%)" }]} />
          </div>
          {scope === "selected" && <RangeField id="p2j-ranges" label="Pages to convert" value={text} onChange={(v) => { setText(v); reset(); }} hint={`Pages 1 to ${src.pageCount}.`} />}
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary" disabled={!!progress} onClick={run}>{progress ? "Working…" : "Convert to JPG"}</button><ResetButton onClick={() => { reset(); setError(""); setText(""); }} /></div>
          <Progress text={progress} />
          {imgs.length > 0 && (
            <Result>
              <p className="font-medium">Done. {imgs.length} {imgs.length === 1 ? "image is" : "images are"} ready.</p>
              {zip[0] && <div className="mt-3"><a href={zip[0].url} download={zip[0].name} className="btn-primary"><Download className="h-4 w-4" aria-hidden="true" />Download all as ZIP ({formatBytes(zip[0].size)})</a></div>}
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {imgs.map((d) => (
                  <li key={d.url} className="rounded-xl border border-line bg-surface p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.url} alt={`Preview of ${d.name}`} className="mx-auto h-40 w-auto max-w-full rounded-lg object-contain" />
                    <p className="mt-2 break-all text-xs text-muted">{d.name} · {dims[d.name]} · {formatBytes(d.size)}</p>
                    <a href={d.url} download={d.name} className="btn-ghost mt-2 w-full !min-h-[40px]"><Download className="h-4 w-4" aria-hidden="true" />Download</a>
                  </li>
                ))}
              </ul>
            </Result>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- JPG / images to PDF ---------------- */
const MAX_IMAGES = 50;

export function ImagesToPdf() {
  const [items, setItems] = useState<{ id: number; file: File; url: string }[]>([]);
  const nid = useRef(1);
  const urls = useRef<string[]>([]);
  const [size, setSize] = useState<LayoutOptions["size"]>("a4");
  const [orientation, setOrientation] = useState<LayoutOptions["orientation"]>("auto");
  const [margin, setMargin] = useState("0");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [dl, setDl] = useDownloads();

  useEffect(() => () => { urls.current.forEach((u) => URL.revokeObjectURL(u)); }, []);

  const add = (list: File[]) => {
    setError(""); setDl([]);
    const ok: { id: number; file: File; url: string }[] = [], errs: string[] = [];
    for (const f of list) {
      const e = checkImage(f);
      if (e) errs.push(e);
      else if (items.length + ok.length >= MAX_IMAGES) { errs.push(`You can add up to ${MAX_IMAGES} images at once.`); break; }
      else { const url = URL.createObjectURL(f); urls.current.push(url); ok.push({ id: nid.current++, file: f, url }); }
    }
    if (ok.length) setItems((x) => [...x, ...ok]);
    if (errs.length) setError([...new Set(errs)].join(" "));
  };
  const remove = (id: number) => { setDl([]); setItems((x) => { const t = x.find((y) => y.id === id); if (t) { URL.revokeObjectURL(t.url); urls.current = urls.current.filter((u) => u !== t.url); } return x.filter((y) => y.id !== id); }); };
  const move = (i: number, d: number) => { setDl([]); setItems((x) => { const j = i + d; if (j < 0 || j >= x.length) return x; const c = [...x]; [c[i], c[j]] = [c[j] as typeof c[number], c[i] as typeof c[number]]; return c; }); };
  const total = items.reduce((s, f) => s + f.file.size, 0);

  const run = async () => {
    setError(""); setDl([]);
    if (total > 300 * 1024 * 1024) { setError("The images add up to more than 300 MB, which is too much to convert safely in a browser tab."); return; }
    try {
      const prepared: ImagePdfItem[] = [];
      for (let i = 0; i < items.length; i++) {
        const f = (items[i] as typeof items[number]).file;
        setProgress(`Preparing image ${i + 1} of ${items.length}…`);
        const img = await loadImage(f); // applies EXIF orientation, decodes WebP
        try {
          const bad = checkDims(img.width, img.height);
          if (bad) throw new Error(`${f.name}: ${bad}`);
          const png = f.type === "image/png";
          const blob = await encodeImage(img, img.width, img.height, png ? "image/png" : "image/jpeg", 0.92);
          prepared.push({ bytes: new Uint8Array(await blob.arrayBuffer()), kind: png ? "png" : "jpg", width: img.width, height: img.height });
        } finally { img.close(); }
      }
      setProgress("Building PDF…");
      const out = await buildImagePdf(prepared, { size, orientation, margin: Number(margin) });
      setDl([{ blob: asBlob(out), name: "images.pdf" }]);
    } catch (e) { setError(errText(e)); } finally { setProgress(""); }
  };

  return (
    <div className="space-y-4">
      <Dropzone id="i2p-files" label="Choose images or drop them here" hint={`JPG, PNG or WebP, up to ${limitLabel(MAX_IMAGE_BYTES)} each, ${MAX_IMAGES} images at most.`} accept="image/jpeg,image/png,image/webp" multiple onFiles={add} />
      {items.length > 0 && (
        <div>
          <p className="label">Page order (top is page 1)</p>
          <ol className="space-y-2">
            {items.map((it, i) => (
              <li key={it.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface2 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt={`Preview of ${it.file.name}`} className="h-14 w-14 shrink-0 rounded-lg bg-surface object-contain" />
                <span className="min-w-0 flex-1 break-all text-sm"><span className="text-muted">{i + 1}.</span> {it.file.name} <span className="text-muted">({formatBytes(it.file.size)})</span></span>
                <button type="button" className="btn-ghost !px-2.5" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${it.file.name} up`}><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                <button type="button" className="btn-ghost !px-2.5" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${it.file.name} down`}><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                <button type="button" className="btn-ghost !px-2.5" onClick={() => remove(it.id)} aria-label={`Remove ${it.file.name}`}><X className="h-4 w-4" aria-hidden="true" /></button>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Select id="i2p-size" label="Page size" value={size} onChange={(v) => { setSize(v as LayoutOptions["size"]); setDl([]); }} options={[{ value: "a4", label: "A4" }, { value: "letter", label: "US Letter" }, { value: "fit", label: "Fit to each image" }]} />
        <Select id="i2p-orient" label="Orientation" value={size === "fit" ? "auto" : orientation} onChange={(v) => { setOrientation(v as LayoutOptions["orientation"]); setDl([]); }} options={[{ value: "auto", label: size === "fit" ? "Not used (page follows image)" : "Automatic (per image)" }, { value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} />
        <Select id="i2p-margin" label="Margin" value={margin} onChange={(v) => { setMargin(v); setDl([]); }} options={[{ value: "0", label: "None" }, { value: "28", label: "Small (10 mm)" }, { value: "57", label: "Medium (20 mm)" }]} />
      </div>
      <p className="text-xs text-muted">Images are scaled to fit the page and centred. JPG and WebP images are re-encoded at 92% quality so phone-photo rotation is applied correctly; PNG stays lossless.</p>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" disabled={items.length < 1 || !!progress} onClick={run}>{progress ? "Working…" : "Create PDF"}</button>
        <ResetButton onClick={() => { urls.current.forEach((u) => URL.revokeObjectURL(u)); urls.current = []; setItems([]); setError(""); setDl([]); }} />
      </div>
      <Progress text={progress} />
      {dl.length > 0 && <Result><p className="mb-3 font-medium">Done. Your PDF has {items.length} {items.length === 1 ? "page" : "pages"}.</p><DownloadList items={dl} /></Result>}
    </div>
  );
}
