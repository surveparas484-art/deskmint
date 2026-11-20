"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCw, Trash2, Undo2 } from "lucide-react";
import { baseName, formatRanges, limitLabel, parseRanges } from "@/lib/files";
import { MAX_IMAGE_BYTES, checkDims, checkImage, encodeImage, loadImage } from "@/lib/image-utils";
import { MAX_PDF_BYTES, addPageNumbers, addWatermark, extractPages, organizePages, type RGB, type WatermarkPosition } from "@/lib/pdf-ops";
import { DownloadList, Dropzone, errText, useDownloads } from "./file-ui";
import { PageGrid, PREVIEW_LIMIT, usePageThumbs } from "./page-grid";
import { FileBar, RangeField, asBlob, useSinglePdf } from "./pdf-tools";
import { ErrorMsg, NumInput, ResetButton, Result, Select, Spinner, parseNum } from "./ui";

const pdfHint = `One PDF, up to ${limitLabel(MAX_PDF_BYTES)}.`;
const toBuf = (b: Uint8Array) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const hexToRgb = (hex: string): RGB => ({ r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255 });

/** First pages of a generated PDF as preview images (so you see the real result before downloading). */
function usePreview() {
  const [urls, setUrls] = useState<string[]>([]);
  const make = async (bytes: Uint8Array) => {
    const acc: string[] = [];
    try {
      const { renderThumbnails } = await import("@/lib/pdf-preview");
      await renderThumbnails(toBuf(bytes), 3, (_p, u) => { acc.push(u); setUrls([...acc]); }, () => false, 320);
    } catch { setUrls([]); }
  };
  return [urls, make, () => setUrls([])] as const;
}

const Previews = ({ urls }: { urls: string[] }) => urls.length === 0 ? null : (
  <div className="mt-4"><p className="mb-2 text-sm text-muted">Preview of the first {urls.length === 1 ? "page" : `${urls.length} pages`} of the result:</p>
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{urls.map((u, i) => <li key={i} className="rounded-xl border border-line bg-white p-1">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={u} alt={`Preview of result, page ${i + 1}`} className="h-auto w-full" /></li>)}</ul></div>
);

/* ---------------- Extract pages ---------------- */
export function ExtractPdfPages() {
  const { src, loading, error: loadErr, pick, clear } = useSinglePdf();
  const { thumbs, note } = usePageThumbs(src ? src.bytes : null, src ? src.pageCount : 0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dl, setDl] = useDownloads();
  const parsed = src ? parseRanges(text, src.pageCount) : null;
  const selected = new Set(parsed && parsed.ok ? parsed.pages : []);
  const toggle = (p: number) => { const s = new Set(selected); if (s.has(p)) s.delete(p); else s.add(p); setText(formatRanges([...s])); setDl([]); setError(""); };
  const run = async () => {
    if (!src) return; setError(""); setDl([]);
    if (!parsed || !parsed.ok) { setError(parsed ? parsed.error : "Select pages to extract."); return; }
    setBusy(true);
    try { setDl([{ blob: asBlob(await extractPages(src.bytes, parsed.pages, src.file.name)), name: `${baseName(src.file.name)}-extracted.pdf` }]); }
    catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      {!src ? <Dropzone id="ext-file" label="Choose a PDF or drop it here" hint={pdfHint} accept="application/pdf,.pdf" onFiles={pick} />
        : <FileBar name={src.file.name} size={src.file.size} pages={src.pageCount} onClear={() => { clear(); setDl([]); setText(""); }} />}
      {loading && <p role="status" className="text-sm text-muted">Reading PDF…</p>}
      {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      {src && (
        <>
          <div><p className="label">Tap pages to keep in the new PDF</p><PageGrid count={src.pageCount} thumbs={thumbs} selected={selected} onToggle={toggle} />{note && <p className="mt-2 text-xs text-muted">{note}</p>}</div>
          <RangeField id="ext-ranges" label="Pages to extract" value={text} onChange={(v) => { setText(v); setDl([]); }} hint={`Pages 1 to ${src.pageCount}. Pages appear in the new PDF in the order you type them.`} />
          {text.trim() && parsed && !parsed.ok && <ErrorMsg>{parsed.error}</ErrorMsg>}
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <div className="flex flex-wrap items-center gap-3"><button type="button" className="btn-primary" disabled={busy || !parsed || !parsed.ok} onClick={run}>{busy ? "Working…" : `Extract ${selected.size || ""} ${selected.size === 1 ? "page" : "pages"}`.replace("  ", " ")}</button><ResetButton onClick={() => { setText(""); setError(""); setDl([]); }} /></div>
          {dl.length > 0 && <Result><p className="mb-3 font-medium">Done. Your original file was not changed.</p><DownloadList items={dl} /></Result>}
        </>
      )}
    </div>
  );
}

/* ---------------- Organize ---------------- */
interface Item { id: number; page: number; rot: number; del: boolean }

export function OrganizePdf() {
  const { src, loading, error: loadErr, pick, clear } = useSinglePdf();
  const { thumbs, note } = usePageThumbs(src ? src.bytes : null, src ? src.pageCount : 0);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dl, setDl] = useDownloads();
  const drag = useRef<number | null>(null);
  const tooMany = !!src && src.pageCount > PREVIEW_LIMIT;

  useEffect(() => { setItems(src && !tooMany ? Array.from({ length: src.pageCount }, (_, i) => ({ id: i + 1, page: i + 1, rot: 0, del: false })) : []); setDl([]); }, [src, tooMany, setDl]);
  const edit = (fn: (x: Item[]) => Item[]) => { setDl([]); setError(""); setItems(fn); };
  const move = (i: number, d: number) => edit((x) => { const j = i + d; if (j < 0 || j >= x.length) return x; const c = [...x]; [c[i], c[j]] = [c[j] as Item, c[i] as Item]; return c; });
  const drop = (to: number) => { const from = drag.current; drag.current = null; if (from === null || from === to) return; edit((x) => { const c = [...x]; const [m] = c.splice(from, 1); c.splice(to, 0, m as Item); return c; }); };
  const kept = items.filter((i) => !i.del);

  const run = async () => {
    if (!src) return; setError(""); setDl([]);
    if (kept.length === 0) { setError("Keep at least one page."); return; }
    setBusy(true);
    try { setDl([{ blob: asBlob(await organizePages(src.bytes, kept.map((k) => ({ page: k.page, rotate: k.rot })), src.file.name)), name: `${baseName(src.file.name)}-organized.pdf` }]); }
    catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {!src ? <Dropzone id="org-file" label="Choose a PDF or drop it here" hint={pdfHint} accept="application/pdf,.pdf" onFiles={pick} />
        : <FileBar name={src.file.name} size={src.file.size} pages={src.pageCount} onClear={() => { clear(); setDl([]); }} />}
      {loading && <p role="status" className="text-sm text-muted">Reading PDF…</p>}
      {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      {tooMany && <ErrorMsg>Organize supports PDFs of up to {PREVIEW_LIMIT} pages. Your file has {src.pageCount}. Use Split PDF or Extract PDF Pages first.</ErrorMsg>}
      {src && !tooMany && (
        <>
          <p className="text-sm text-muted">Drag pages to reorder (on touch screens use the arrow buttons). {kept.length} of {items.length} pages will be kept.</p>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((it, i) => (
              <li key={it.id} draggable onDragStart={() => { drag.current = i; }} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(i)}
                className={`rounded-xl border bg-surface p-2 ${it.del ? "border-danger/60 opacity-60" : "border-line"}`}>
                <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-white">
                  {thumbs[it.page] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={thumbs[it.page]} alt={`Original page ${it.page}${it.rot ? `, rotated ${it.rot} degrees` : ""}`} className="max-h-full max-w-full object-contain transition-transform" style={{ transform: `rotate(${it.rot}deg)` }} /> : <span className="text-sm text-neutral-600">{it.page}</span>}
                </div>
                <p className="mt-1 text-center text-xs text-muted">New position {i + 1} · was page {it.page}{it.del ? " · deleted" : ""}</p>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  <button type="button" className="btn-ghost !min-h-[40px] !px-0" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move page ${it.page} earlier`}><ArrowLeft className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" className="btn-ghost !min-h-[40px] !px-0" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move page ${it.page} later`}><ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" className="btn-ghost !min-h-[40px] !px-0" onClick={() => edit((x) => x.map((y) => (y.id === it.id ? { ...y, rot: (y.rot + 90) % 360 } : y)))} aria-label={`Rotate page ${it.page} 90 degrees clockwise`}><RotateCw className="h-4 w-4" aria-hidden="true" /></button>
                  <button type="button" className="btn-ghost !min-h-[40px] !px-0" onClick={() => edit((x) => x.map((y) => (y.id === it.id ? { ...y, del: !y.del } : y)))} aria-label={it.del ? `Restore page ${it.page}` : `Delete page ${it.page}`}>{it.del ? <Undo2 className="h-4 w-4" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}</button>
                </div>
              </li>
            ))}
          </ol>
          {note && <p className="text-xs text-muted">{note}</p>}
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary" disabled={busy || kept.length === 0} onClick={run}>{busy ? "Working…" : "Export PDF"}</button>
            <ResetButton onClick={() => { setItems(Array.from({ length: src.pageCount }, (_, i) => ({ id: i + 1, page: i + 1, rot: 0, del: false }))); setDl([]); setError(""); }} /></div>
          {dl.length > 0 && <Result><p className="mb-3 font-medium">Done. Your original file was not changed.</p><DownloadList items={dl} /></Result>}
        </>
      )}
    </div>
  );
}

/* ---------------- Add page numbers ---------------- */
export function AddPageNumbers() {
  const { src, loading, error: loadErr, pick, clear } = useSinglePdf();
  const [position, setPosition] = useState<"top" | "bottom">("bottom");
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [startAt, setStartAt] = useState("1");
  const [firstPage, setFirstPage] = useState("1");
  const [size, setSize] = useState("12");
  const [color, setColor] = useState("#000000");
  const [format, setFormat] = useState("{n}");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dl, setDl] = useDownloads();
  const [prev, makePrev, clearPrev] = usePreview();
  const reset = () => { setDl([]); clearPrev(); };

  const run = async () => {
    if (!src) return; setError(""); reset();
    const s = parseNum(startAt), f = parseNum(firstPage), fs = parseNum(size);
    if (!Number.isInteger(s) || s < 0 || s > 100000) { setError("The starting number must be a whole number from 0 to 100000."); return; }
    if (!Number.isInteger(f) || f < 1 || f > src.pageCount) { setError(`The first page to number must be between 1 and ${src.pageCount}.`); return; }
    if (!(fs >= 6 && fs <= 48)) { setError("Font size must be between 6 and 48."); return; }
    if (!format.includes("{n}") || format.length > 60) { setError("The format must include {n} (the page number) and be at most 60 characters."); return; }
    setBusy(true);
    try {
      const out = await addPageNumbers(src.bytes, { position, align, startAt: s, firstPage: f, fontSize: fs, color: hexToRgb(color), format }, src.file.name);
      setDl([{ blob: asBlob(out), name: `${baseName(src.file.name)}-numbered.pdf` }]);
      await makePrev(out);
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {!src ? <Dropzone id="num-file" label="Choose a PDF or drop it here" hint={pdfHint} accept="application/pdf,.pdf" onFiles={pick} />
        : <FileBar name={src.file.name} size={src.file.size} pages={src.pageCount} onClear={() => { clear(); reset(); }} />}
      {loading && <p role="status" className="text-sm text-muted">Reading PDF…</p>}
      {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      {src && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select id="num-pos" label="Position" value={position} onChange={(v) => { setPosition(v as "top" | "bottom"); reset(); }} options={[{ value: "bottom", label: "Bottom" }, { value: "top", label: "Top" }]} />
            <Select id="num-align" label="Alignment" value={align} onChange={(v) => { setAlign(v as "left" | "center" | "right"); reset(); }} options={[{ value: "left", label: "Left" }, { value: "center", label: "Centre" }, { value: "right", label: "Right" }]} />
            <NumInput id="num-size" label="Font size (pt)" value={size} onChange={(v) => { setSize(v); reset(); }} />
            <NumInput id="num-first" label="First page to number" value={firstPage} onChange={(v) => { setFirstPage(v); reset(); }} hint="Use 2 to skip a cover page." />
            <NumInput id="num-start" label="Starting number" value={startAt} onChange={(v) => { setStartAt(v); reset(); }} hint="The number shown on the first numbered page." />
            <div><label htmlFor="num-color" className="label">Colour</label><input id="num-color" type="color" value={color} onChange={(e) => { setColor(e.target.value); reset(); }} className="h-11 w-full cursor-pointer rounded-xl border border-line bg-bg p-1" /></div>
          </div>
          <div><label htmlFor="num-format" className="label">Format</label>
            <input id="num-format" className="input" value={format} onChange={(e) => { setFormat(e.target.value); reset(); }} aria-describedby="num-format-h" />
            <p id="num-format-h" className="mt-1 text-xs text-muted">Use {"{n}"} for the page number and {"{total}"} for the last number, e.g. "Page {"{n}"} of {"{total}"}. Latin letters, digits and punctuation only.</p></div>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <div className="flex flex-wrap items-center gap-3"><button type="button" className="btn-primary" disabled={busy} onClick={run}>{busy ? "Working…" : "Add numbers and preview"}</button>{busy && <Spinner />}</div>
          {dl.length > 0 && <Result><p className="mb-3 font-medium">Done. Check the preview, then download.</p><DownloadList items={dl} /><Previews urls={prev} /></Result>}
        </>
      )}
    </div>
  );
}

/* ---------------- Add watermark ---------------- */
const POSITIONS: { value: WatermarkPosition; label: string }[] = [
  { value: "center", label: "Centre" }, { value: "top-left", label: "Top left" }, { value: "top-center", label: "Top centre" }, { value: "top-right", label: "Top right" },
  { value: "middle-left", label: "Middle left" }, { value: "middle-right", label: "Middle right" }, { value: "bottom-left", label: "Bottom left" }, { value: "bottom-center", label: "Bottom centre" }, { value: "bottom-right", label: "Bottom right" },
];

export function AddWatermark() {
  const { src, loading, error: loadErr, pick, clear } = useSinglePdf();
  const [kind, setKind] = useState("text");
  const [text, setText] = useState("CONFIDENTIAL");
  const [img, setImg] = useState<{ file: File; bytes: Uint8Array; kind: "png" | "jpg"; width: number; height: number } | null>(null);
  const [imgErr, setImgErr] = useState("");
  const [size, setSize] = useState("48");
  const [imgPct, setImgPct] = useState("40");
  const [color, setColor] = useState("#888888");
  const [opacity, setOpacity] = useState(30);
  const [rotation, setRotation] = useState("45");
  const [position, setPosition] = useState<WatermarkPosition>("center");
  const [scope, setScope] = useState("all");
  const [ranges, setRanges] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dl, setDl] = useDownloads();
  const [prev, makePrev, clearPrev] = usePreview();
  const reset = () => { setDl([]); clearPrev(); };

  const pickImage = async (files: File[]) => {
    const f = files[0]; if (!f) return; setImgErr(""); reset();
    const bad = checkImage(f); if (bad) { setImgErr(bad); return; }
    try {
      const im = await loadImage(f);
      try {
        const d = checkDims(im.width, im.height); if (d) throw new Error(d);
        const png = f.type === "image/png"; // PNG keeps transparency; others are re-encoded as JPEG (EXIF-aware)
        const blob = await encodeImage(im, im.width, im.height, png ? "image/png" : "image/jpeg", 0.92);
        setImg({ file: f, bytes: new Uint8Array(await blob.arrayBuffer()), kind: png ? "png" : "jpg", width: im.width, height: im.height });
      } finally { im.close(); }
    } catch (e) { setImgErr(errText(e)); }
  };

  const run = async () => {
    if (!src) return; setError(""); reset();
    const fs = parseNum(size), rot = parseNum(rotation), pct = parseNum(imgPct);
    if (kind === "text" && (!text.trim() || text.length > 80)) { setError("Enter watermark text of up to 80 characters."); return; }
    if (kind === "image" && !img) { setError("Choose a watermark image."); return; }
    if (kind === "text" && !(fs >= 8 && fs <= 200)) { setError("Font size must be between 8 and 200."); return; }
    if (kind === "image" && !(pct >= 5 && pct <= 100)) { setError("Image width must be between 5% and 100% of the page width."); return; }
    if (!(rot >= -180 && rot <= 180)) { setError("Rotation must be between -180 and 180 degrees."); return; }
    let pages: number[];
    if (scope === "all") pages = Array.from({ length: src.pageCount }, (_, i) => i + 1);
    else { const r = parseRanges(ranges, src.pageCount); if (!r.ok) { setError(r.error); return; } pages = r.pages; }
    setBusy(true);
    try {
      const out = await addWatermark(src.bytes, { text: kind === "text" ? text.trim() : undefined, image: kind === "image" ? img ?? undefined : undefined, imageWidthPct: pct, fontSize: fs, color: hexToRgb(color), opacity: opacity / 100, rotation: rot, position, pages }, src.file.name);
      setDl([{ blob: asBlob(out), name: `${baseName(src.file.name)}-watermarked.pdf` }]);
      await makePrev(out);
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {!src ? <Dropzone id="wm-file" label="Choose a PDF or drop it here" hint={pdfHint} accept="application/pdf,.pdf" onFiles={pick} />
        : <FileBar name={src.file.name} size={src.file.size} pages={src.pageCount} onClear={() => { clear(); reset(); }} />}
      {loading && <p role="status" className="text-sm text-muted">Reading PDF…</p>}
      {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      {src && (
        <>
          <Select id="wm-kind" label="Watermark type" value={kind} onChange={(v) => { setKind(v); reset(); }} options={[{ value: "text", label: "Text" }, { value: "image", label: "Image (PNG, JPG or WebP)" }]} />
          {kind === "text" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-3"><label htmlFor="wm-text" className="label">Text</label><input id="wm-text" className="input" value={text} maxLength={80} onChange={(e) => { setText(e.target.value); reset(); }} /></div>
              <NumInput id="wm-size" label="Font size (pt)" value={size} onChange={(v) => { setSize(v); reset(); }} />
              <div><label htmlFor="wm-color" className="label">Colour</label><input id="wm-color" type="color" value={color} onChange={(e) => { setColor(e.target.value); reset(); }} className="h-11 w-full cursor-pointer rounded-xl border border-line bg-bg p-1" /></div>
            </div>
          ) : (
            <div className="space-y-3">
              {!img ? <Dropzone id="wm-img" label="Choose a watermark image" hint={`JPG, PNG or WebP, up to ${limitLabel(MAX_IMAGE_BYTES)}.`} accept="image/jpeg,image/png,image/webp" onFiles={pickImage} />
                : <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface2 p-3 text-sm"><span className="break-all">{img.file.name} · {img.width}×{img.height}px</span><button type="button" className="btn-ghost shrink-0" onClick={() => { setImg(null); reset(); }}>Replace</button></div>}
              {imgErr && <ErrorMsg>{imgErr}</ErrorMsg>}
              <NumInput id="wm-pct" label="Image width (% of page width)" value={imgPct} onChange={(v) => { setImgPct(v); reset(); }} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label htmlFor="wm-op" className="label">Opacity: {opacity}%</label><input id="wm-op" type="range" min={5} max={100} step={5} value={opacity} onChange={(e) => { setOpacity(Number(e.target.value)); reset(); }} className="h-11 w-full accent-[rgb(var(--accent))]" /></div>
            <NumInput id="wm-rot" label="Rotation (degrees)" value={rotation} onChange={(v) => { setRotation(v); reset(); }} hint="-180 to 180, anticlockwise is positive." />
            <Select id="wm-pos" label="Position" value={position} onChange={(v) => { setPosition(v as WatermarkPosition); reset(); }} options={POSITIONS} />
          </div>
          <Select id="wm-scope" label="Apply to" value={scope} onChange={(v) => { setScope(v); reset(); }} options={[{ value: "all", label: "All pages" }, { value: "selected", label: "Selected pages" }]} />
          {scope === "selected" && <RangeField id="wm-ranges" label="Pages" value={ranges} onChange={(v) => { setRanges(v); reset(); }} hint={`Pages 1 to ${src.pageCount}.`} />}
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <div className="flex flex-wrap items-center gap-3"><button type="button" className="btn-primary" disabled={busy} onClick={run}>{busy ? "Working…" : "Apply watermark and preview"}</button>{busy && <Spinner />}</div>
          {dl.length > 0 && <Result><p className="mb-3 font-medium">Done. Check the preview, then download. Your original file was not changed.</p><DownloadList items={dl} /><Previews urls={prev} /></Result>}
        </>
      )}
    </div>
  );
}
