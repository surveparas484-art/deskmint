"use client";
import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { baseName, formatBytes, limitLabel } from "@/lib/files";
import { clampRect, fitRatio, moveRect, resizeCorner, type Corner, type Rect } from "@/lib/crop";
import { EXT, LABEL, MAX_IMAGE_BYTES, checkDims, checkImage, encodeImage, loadImage, type LoadedImage } from "@/lib/image-utils";
import { createZip } from "@/lib/zip";
import { DownloadList, Dropzone, errText, useDownloads } from "./file-ui";
import { ErrorMsg, NumInput, ResetButton, Result, Select, Spinner, parseNum } from "./ui";

const FORMATS = [{ value: "image/jpeg", label: "JPG" }, { value: "image/png", label: "PNG" }, { value: "image/webp", label: "WebP" }];

/* ---------------- Image format converter ---------------- */
const MAX_FILES = 30;

export function ImageConverter() {
  const [files, setFiles] = useState<{ id: number; file: File }[]>([]);
  const nid = useRef(1);
  const [target, setTarget] = useState("image/png");
  const [quality, setQuality] = useState(90);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [out, setOut] = useDownloads();
  const [zip, setZip] = useDownloads();
  const [info, setInfo] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const lossy = target !== "image/png";
  const reset = () => { setOut([]); setZip([]); setInfo({}); setFailed([]); };

  const add = (list: File[]) => {
    setError(""); reset();
    const ok: { id: number; file: File }[] = [], errs: string[] = [];
    for (const f of list) {
      const e = checkImage(f);
      if (e) errs.push(e);
      else if (files.length + ok.length >= MAX_FILES) { errs.push(`You can convert up to ${MAX_FILES} images at once.`); break; }
      else ok.push({ id: nid.current++, file: f });
    }
    if (ok.length) setFiles((x) => [...x, ...ok]);
    if (errs.length) setError([...new Set(errs)].join(" "));
  };

  const run = async () => {
    setError(""); reset();
    if (files.reduce((s, f) => s + f.file.size, 0) > 300 * 1024 * 1024) { setError("The images add up to more than 300 MB, which is too much to convert safely in a browser tab."); return; }
    const done: { blob: Blob; name: string }[] = [], meta: Record<string, string> = {}, bad: string[] = [], used = new Set<string>();
    for (let i = 0; i < files.length; i++) {
      const f = (files[i] as (typeof files)[number]).file;
      setProgress(`Converting ${i + 1} of ${files.length}…`);
      if (f.type === target) { bad.push(`${f.name}: already a ${LABEL[target]} file, skipped.`); continue; }
      let im: LoadedImage | null = null;
      try {
        im = await loadImage(f);
        const d = checkDims(im.width, im.height); if (d) throw new Error(d);
        const blob = await encodeImage(im, im.width, im.height, target, quality / 100);
        let name = `${baseName(f.name)}.${EXT[target]}`; for (let n = 2; used.has(name); n++) name = `${baseName(f.name)}-${n}.${EXT[target]}`; used.add(name);
        done.push({ blob, name });
        meta[name] = `${LABEL[f.type]} → ${LABEL[target]} · ${im.width}×${im.height}px · ${formatBytes(f.size)} → ${formatBytes(blob.size)}`;
      } catch (e) { bad.push(`${f.name}: ${errText(e)}`); } finally { im?.close(); }
      await new Promise((r) => setTimeout(r, 0));
    }
    setOut(done); setInfo(meta); setFailed(bad);
    if (done.length > 1) {
      setProgress("Creating ZIP…");
      const zf = await Promise.all(done.map(async (d) => ({ name: d.name, data: new Uint8Array(await d.blob.arrayBuffer()) })));
      setZip([{ blob: new Blob([createZip(zf) as unknown as BlobPart], { type: "application/zip" }), name: `converted-${EXT[target]}-images.zip` }]);
    }
    setProgress("");
  };

  return (
    <div className="space-y-4">
      <Dropzone id="conv-files" label="Choose images or drop them here" hint={`JPG, PNG or WebP, up to ${limitLabel(MAX_IMAGE_BYTES)} each, ${MAX_FILES} images at most.`} accept="image/jpeg,image/png,image/webp" multiple onFiles={add} />
      {files.length > 0 && (
        <ul className="space-y-2">{files.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface2 p-2 pl-3 text-sm">
            <span className="min-w-0 break-all">{f.file.name} <span className="text-muted">({LABEL[f.file.type]}, {formatBytes(f.file.size)})</span></span>
            <button type="button" className="btn-ghost shrink-0 !min-h-[36px]" onClick={() => { reset(); setFiles((x) => x.filter((y) => y.id !== f.id)); }} aria-label={`Remove ${f.file.name}`}>Remove</button>
          </li>))}</ul>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Select id="conv-fmt" label="Convert to" value={target} onChange={(v) => { setTarget(v); reset(); }} options={FORMATS} />
        <div><label htmlFor="conv-q" className="label">Quality: {lossy ? `${quality}%` : "not used for PNG"}</label>
          <input id="conv-q" type="range" min={10} max={100} step={5} value={quality} disabled={!lossy} onChange={(e) => { setQuality(Number(e.target.value)); reset(); }} className="h-11 w-full accent-[rgb(var(--accent))]" /></div>
      </div>
      <p className="text-xs text-muted">{lossy ? `${LABEL[target]} is a lossy format: converting re-compresses the image and cannot restore detail. ` : "PNG is lossless, but a JPG or WebP converted to PNG keeps its existing quality loss and is usually larger. "}{target === "image/jpeg" ? "JPG has no transparency; transparent areas become white." : ""}</p>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" disabled={files.length === 0 || !!progress} onClick={run}>{progress ? "Working…" : `Convert ${files.length || ""} ${files.length === 1 ? "image" : "images"}`.replace("  ", " ")}</button>
        <ResetButton onClick={() => { setFiles([]); setError(""); reset(); }} />
      </div>
      <p role="status" aria-live="polite" className="flex min-h-[20px] items-center gap-2 text-sm text-muted">{progress && <Spinner />}{progress}</p>
      {failed.length > 0 && <ErrorMsg>{failed.join(" ")}</ErrorMsg>}
      {out.length > 0 && (
        <Result>
          <p className="mb-3 font-medium">Done. {out.length} {out.length === 1 ? "image" : "images"} converted.</p>
          {zip[0] && <a href={zip[0].url} download={zip[0].name} className="btn-primary mb-4"><Download className="h-4 w-4" aria-hidden="true" />Download all as ZIP ({formatBytes(zip[0].size)})</a>}
          <ul className="space-y-3">{out.map((d) => (
            <li key={d.url} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.url} alt={`Preview of ${d.name}`} className="h-14 w-14 shrink-0 rounded-lg bg-surface2 object-contain" />
              <span className="min-w-0 flex-1 text-sm"><strong className="break-all">{d.name}</strong><br /><span className="text-muted">{info[d.name]}</span></span>
              <a href={d.url} download={d.name} className="btn-ghost !min-h-[40px]"><Download className="h-4 w-4" aria-hidden="true" />Download</a>
            </li>))}</ul>
        </Result>
      )}
    </div>
  );
}

/* ---------------- Image cropper ---------------- */
const RATIOS: Record<string, number | null> = { free: null, "1:1": 1, "4:5": 4 / 5, "16:9": 16 / 9 };
type Drag = { kind: "move" | Corner; start: Rect; px: number; py: number };

export function ImageCropper() {
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [url, setUrl] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [ratioKey, setRatioKey] = useState("free");
  const [format, setFormat] = useState("image/jpeg");
  const [quality, setQuality] = useState(92);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dl, setDl] = useDownloads();
  const [dispW, setDispW] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const keep = useRef<LoadedImage | null>(null);

  useEffect(() => () => { keep.current?.close(); }, []);
  useEffect(() => { if (!file) { setUrl(""); return; } const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setDispW(el.clientWidth)); ro.observe(el); setDispW(el.clientWidth);
    return () => ro.disconnect();
  }, [img]);

  const pick = async (files: File[]) => {
    const f = files[0]; if (!f) return; setLoadErr(""); setDl([]);
    const bad = checkImage(f); if (bad) { setLoadErr(bad); return; }
    try {
      const im = await loadImage(f);
      const d = im.width * im.height > 120_000_000 ? "This image has too many pixels to open in a browser tab." : null;
      if (d) { im.close(); throw new Error(d); }
      keep.current?.close(); keep.current = im;
      setImg(im); setFile(f); setRatioKey("free"); setRect(fitRatio(im.width, im.height, im.width / im.height, 0.8));
      setFormat(f.type === "image/png" ? "image/png" : f.type === "image/webp" ? "image/webp" : "image/jpeg");
    } catch (e) { setLoadErr(errText(e)); }
  };

  const scale = img && dispW ? dispW / img.width : 1;
  const ratio = RATIOS[ratioKey] ?? null;
  const edit = (r: Rect) => { setDl([]); setError(""); setRect(r); };

  const applyRatio = (key: string) => {
    setRatioKey(key);
    const rr = RATIOS[key] ?? null;
    if (img && rr) edit(fitRatio(img.width, img.height, rr));
  };

  const toImg = (e: React.PointerEvent) => { const b = box.current!.getBoundingClientRect(); return { x: (e.clientX - b.left) / scale, y: (e.clientY - b.top) / scale }; };
  const down = (kind: Drag["kind"]) => (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); const p = toImg(e); drag.current = { kind, start: rect, px: p.x, py: p.y }; };
  const moveEv = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || !img) return; const p = toImg(e);
    edit(d.kind === "move" ? moveRect(d.start, p.x - d.px, p.y - d.py, img.width, img.height) : resizeCorner(d.start, d.kind, p.x, p.y, img.width, img.height, ratio));
  };
  const up = () => { drag.current = null; };

  const num = (k: keyof Rect) => (v: string) => {
    if (!img) return; const n = parseNum(v); if (!Number.isFinite(n)) return;
    let r = { ...rect, [k]: n };
    if (ratio && (k === "w" || k === "h")) r = k === "w" ? { ...r, h: n / ratio } : { ...r, w: n * ratio };
    edit(clampRect(r, img.width, img.height, 1));
  };

  const run = async () => {
    if (!file || !img) return; setError(""); setDl([]);
    const d = checkDims(rect.w, rect.h); if (d) { setError(d); return; }
    setBusy(true);
    try {
      const canvas = document.createElement("canvas"); canvas.width = rect.w; canvas.height = rect.h;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Your browser could not create a drawing surface.");
      if (format === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, rect.w, rect.h); }
      ctx.drawImage(img.source, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, format, format === "image/png" ? undefined : quality / 100));
      canvas.width = 0; canvas.height = 0;
      if (!blob) throw new Error("The browser could not encode the image.");
      if (blob.type !== format) throw new Error(`This browser cannot create ${LABEL[format]} files. Choose another format.`);
      setDl([{ blob, name: `${baseName(file.name)}-cropped.${EXT[format]}` }]);
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  const handle = (c: Corner) => `absolute h-7 w-7 touch-none rounded-full border-2 border-white bg-accent shadow ${c === "nw" ? "-left-3.5 -top-3.5 cursor-nwse-resize" : c === "ne" ? "-right-3.5 -top-3.5 cursor-nesw-resize" : c === "sw" ? "-bottom-3.5 -left-3.5 cursor-nesw-resize" : "-bottom-3.5 -right-3.5 cursor-nwse-resize"}`;
  const out = dl[0];

  return (
    <div className="space-y-4">
      {!file ? <Dropzone id="crop-file" label="Choose an image or drop it here" hint={`JPG, PNG or WebP, up to ${limitLabel(MAX_IMAGE_BYTES)}.`} accept="image/jpeg,image/png,image/webp" onFiles={pick} />
        : <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface2 p-3"><p className="min-w-0 break-all text-sm"><strong>{file.name}</strong><span className="text-muted"> · {formatBytes(file.size)}{img ? ` · ${img.width}×${img.height}px` : ""}</span></p><button type="button" className="btn-ghost shrink-0" onClick={() => { keep.current?.close(); keep.current = null; setImg(null); setFile(null); setDl([]); }}>Replace image</button></div>}
      {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      {file && img && url && (
        <>
          <div ref={box} className="relative mx-auto w-full max-w-2xl select-none overflow-hidden rounded-xl bg-surface2" style={{ touchAction: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Image to crop" className="block h-auto w-full" draggable={false} />
            <div role="group" aria-label="Crop selection" onPointerDown={down("move")} onPointerMove={moveEv} onPointerUp={up} onPointerCancel={up}
              className="absolute cursor-move touch-none border-2 border-white" style={{ left: rect.x * scale, top: rect.y * scale, width: rect.w * scale, height: rect.h * scale, boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}>
              {(["nw", "ne", "sw", "se"] as Corner[]).map((c) => <span key={c} className={handle(c)} onPointerDown={down(c)} onPointerMove={moveEv} onPointerUp={up} onPointerCancel={up} />)}
            </div>
          </div>
          <p className="text-center text-xs text-muted">Drag the box to move it and drag the corner dots to resize. Selection: {rect.w}×{rect.h}px at ({rect.x}, {rect.y}).</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <NumInput id="crop-x" label="X (px)" value={String(rect.x)} onChange={num("x")} />
            <NumInput id="crop-y" label="Y (px)" value={String(rect.y)} onChange={num("y")} />
            <NumInput id="crop-w" label="Width (px)" value={String(rect.w)} onChange={num("w")} />
            <NumInput id="crop-h" label="Height (px)" value={String(rect.h)} onChange={num("h")} />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Aspect ratio">
            {[["free", "Free"], ["1:1", "Square 1:1"], ["4:5", "Portrait 4:5"], ["16:9", "Landscape 16:9"]].map(([k, l]) => (
              <button key={k} type="button" className={`chip ${ratioKey === k ? "chip-on" : ""}`} aria-pressed={ratioKey === k} onClick={() => applyRatio(k as string)}>{l}</button>))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select id="crop-fmt" label="Save as" value={format} onChange={(v) => { setFormat(v); setDl([]); }} options={FORMATS} />
            <div><label htmlFor="crop-q" className="label">Quality: {format === "image/png" ? "not used for PNG" : `${quality}%`}</label>
              <input id="crop-q" type="range" min={10} max={100} step={5} value={quality} disabled={format === "image/png"} onChange={(e) => { setQuality(Number(e.target.value)); setDl([]); }} className="h-11 w-full accent-[rgb(var(--accent))]" /></div>
          </div>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" disabled={busy} onClick={run}>{busy ? "Working…" : "Crop image"}</button>
            <ResetButton onClick={() => { setRatioKey("free"); setRect(fitRatio(img.width, img.height, img.width / img.height, 0.8)); setDl([]); setError(""); }} />
          </div>
          {out && (
            <Result>
              <p className="mb-3 font-medium">Done: {rect.w}×{rect.h}px · {formatBytes(out.size)}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={out.url} alt="Cropped result" className="mb-3 max-h-64 w-auto max-w-full rounded-lg border border-line bg-surface2 object-contain" />
              <DownloadList items={dl} />
            </Result>
          )}
        </>
      )}
    </div>
  );
}
