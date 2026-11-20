"use client";
import { useEffect, useRef, useState } from "react";
import { baseName, formatBytes, limitLabel, scaleDim } from "@/lib/files";
import { EXT, LABEL, MAX_IMAGE_BYTES, checkDims, checkImage, encodeImage, loadImage, type LoadedImage } from "@/lib/image-utils";
import { DownloadList, Dropzone, errText, useDownloads } from "./file-ui";
import { ErrorMsg, NumInput, parseNum, ResetButton, Result, Select, Spinner } from "./ui";

function useImageFile() {
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const prev = useRef<LoadedImage | null>(null);

  useEffect(() => () => { prev.current?.close(); }, []);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const pick = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError("");
    const bad = checkImage(f);
    if (bad) { setError(bad); return; }
    setLoading(true);
    try {
      const loaded = await loadImage(f);
      const dimErr = loaded.width * loaded.height > 120_000_000 ? "This image has too many pixels to open in a browser tab." : null;
      if (dimErr) { loaded.close(); throw new Error(dimErr); }
      prev.current?.close();
      prev.current = loaded;
      setImg(loaded); setFile(f);
    } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  };
  const clear = () => { prev.current?.close(); prev.current = null; setImg(null); setFile(null); setError(""); };
  return { file, img, preview, error, loading, pick, clear };
}

const Fig = ({ src, alt, caption }: { src: string; alt: string; caption: string }) => (
  <figure className="min-w-0 rounded-xl border border-line bg-bg p-2">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={alt} className="mx-auto max-h-64 w-auto max-w-full rounded-lg object-contain" />
    <figcaption className="mt-2 text-center text-sm text-muted">{caption}</figcaption>
  </figure>
);

const IMG_MIN_TARGET = 5 * 1024;
const IMG_UNIT = { KB: 1024, MB: 1024 * 1024 } as const;
type ImgUnit = keyof typeof IMG_UNIT;
const IMG_PRESETS_KB = [20, 50, 100, 200, 500] as const;

async function compressImageToTarget(
  img: LoadedImage,
  targetBytes: number,
  mime: string,
  maxWidth: number | null
): Promise<{ blob: Blob; width: number; height: number; met: boolean }> {
  const effectiveMime = mime === "image/png" ? "image/webp" : mime;
  const baseW = maxWidth && maxWidth < img.width ? maxWidth : img.width;
  const baseH = scaleDim(img.height, img.width, baseW);

  let best: { blob: Blob; width: number; height: number } | null = null;
  let smallest: { blob: Blob; width: number; height: number } | null = null;

  const tryEncode = async (w: number, h: number, q: number) => {
    const blob = await encodeImage(img, w, h, effectiveMime, q);
    const cand = { blob, width: w, height: h };
    if (!smallest || blob.size < smallest.blob.size) smallest = cand;
    if (blob.size <= targetBytes && (!best || blob.size > best.blob.size)) best = cand;
    return blob.size <= targetBytes;
  };

  if (await tryEncode(baseW, baseH, 0.15)) {
    let lo = 0.15, hi = 0.90;
    for (let i = 0; i < 6; i++) {
      const mid = (lo + hi) / 2;
      if (await tryEncode(baseW, baseH, mid)) lo = mid; else hi = mid;
    }
  }

  if (!best) {
    for (const scale of [0.8, 0.65, 0.5, 0.35]) {
      const sw = Math.max(64, Math.round(baseW * scale));
      const sh = Math.max(64, Math.round(baseH * scale));
      if (await tryEncode(sw, sh, 0.55)) {
        await tryEncode(sw, sh, 0.72);
        break;
      }
      if (await tryEncode(sw, sh, 0.25)) break;
    }
  }

  const pick = (best ?? smallest) as any;
  return { ...pick, met: best !== null };
}

/* ---------------- Compressor ---------------- */
export function ImageCompressor({ defaultTargetKb }: { defaultTargetKb?: number } = {}) {
  const { file, img, preview, error: loadErr, loading, pick, clear } = useImageFile();
  const [compMode, setCompMode] = useState<"quality" | "target">(defaultTargetKb ? "target" : "quality");
  const [format, setFormat] = useState("auto");
  const [quality, setQuality] = useState(78);
  const [maxW, setMaxW] = useState("");
  const [targetUnit, setTargetUnit] = useState<ImgUnit>("KB");
  const [targetText, setTargetText] = useState(String(defaultTargetKb ?? 100));
  const [targetBytes, setTargetBytes] = useState((defaultTargetKb ?? 100) * 1024);
  const [targetMet, setTargetMet] = useState<boolean | null>(null);
  const [alreadyUnder, setAlreadyUnder] = useState(false);
  const [bloated, setBloated] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dl, setDl] = useDownloads();
  const [mime, setMime] = useState("");
  const [outDims, setOutDims] = useState<[number, number] | null>(null);

  const outMime = file ? (format === "auto" ? file.type : format) : "";

  useEffect(() => {
    if (!file) return;
    if (!defaultTargetKb) {
      const defB = Math.max(IMG_MIN_TARGET, Math.round(file.size * 0.5));
      const u: ImgUnit = defB >= IMG_UNIT.MB ? "MB" : "KB";
      setTargetUnit(u);
      setTargetBytes(defB);
      setTargetText(u === "KB" ? String(Math.round(defB / 1024)) : String(Number((defB / IMG_UNIT.MB).toFixed(2))));
    }
  }, [file, defaultTargetKb]);

  const applyPresetKb = (kb: number) => {
    setTargetUnit("KB");
    setTargetBytes(kb * 1024);
    setTargetText(String(kb));
  };

  const onTargetTextChange = (v: string) => {
    setTargetText(v);
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) {
      setTargetBytes(Math.max(IMG_MIN_TARGET, Math.round(n * IMG_UNIT[targetUnit])));
    }
  };

  useEffect(() => {
    if (!file || !img) { setDl([]); setBloated(false); setAlreadyUnder(false); setTargetMet(null); return; }
    let stop = false;
    const t = setTimeout(async () => {
      setError(""); setBusy(true); setBloated(false); setAlreadyUnder(false); setTargetMet(null);
      try {
        const cap = maxW.trim() === "" ? NaN : parseNum(maxW);
        if (maxW.trim() !== "" && (Number.isNaN(cap) || !Number.isInteger(cap) || cap < 1)) {
          throw new Error("Maximum width must be a whole number of pixels, or leave it empty.");
        }
        const capW = !Number.isNaN(cap) ? cap : null;

        if (compMode === "target") {
          if (file.size <= targetBytes) {
            if (!stop) { setDl([]); setAlreadyUnder(true); }
            return;
          }
          const targetMime = outMime === "image/png" ? "image/webp" : outMime;
          const res = await compressImageToTarget(img, targetBytes, targetMime, capW);
          if (stop) return;
          if (res.blob.size >= file.size) {
            setDl([]); setBloated(true);
            return;
          }
          setMime(targetMime); setOutDims([res.width, res.height]); setTargetMet(res.met);
          setDl([{ blob: res.blob, name: `${baseName(file.name)}-compressed.${EXT[targetMime] ?? "img"}` }]);
          return;
        }

        const w = capW && capW < img.width ? capW : img.width;
        const h = scaleDim(img.height, img.width, w);
        const bad = checkDims(w, h);
        if (bad) throw new Error(bad);
        const blob = await encodeImage(img, w, h, outMime, quality / 100);
        if (stop) return;
        if (blob.size >= file.size) {
          setDl([]); setBloated(true);
          return;
        }
        setMime(outMime); setOutDims([w, h]);
        setDl([{ blob, name: `${baseName(file.name)}-compressed.${EXT[outMime] ?? "img"}` }]);
      } catch (e) { if (!stop) { setDl([]); setError(errText(e)); } } finally { if (!stop) setBusy(false); }
    }, 280);
    return () => { stop = true; clearTimeout(t); };
  }, [file, img, outMime, quality, maxW, compMode, targetBytes, setDl]);

  const out = dl[0];
  const diff = file && out ? ((out.size - file.size) / file.size) * 100 : 0;
  const smaller = !!file && !!out && out.size < file.size;
  const lossless = outMime === "image/png" && compMode === "quality";

  return (
    <div className="space-y-4">
      {!file ? <Dropzone id="comp-file" label="Choose an image or drop it here" hint={`JPG, PNG or WebP, up to ${limitLabel(MAX_IMAGE_BYTES)}.`} accept="image/jpeg,image/png,image/webp" onFiles={pick} />
        : <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg p-3"><p className="min-w-0 break-all text-sm"><strong>{file.name}</strong><span className="text-muted"> · {formatBytes(file.size)}{img ? ` · ${img.width}×${img.height}px` : ""}</span></p><button type="button" className="btn-ghost shrink-0" onClick={() => { clear(); setDl([]); setBloated(false); setAlreadyUnder(false); }}>Replace image</button></div>}
      {loading && <p role="status" className="text-sm text-muted">Reading image…</p>}
      {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      {file && (
        <>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Compression mode">
            <button type="button" role="tab" aria-selected={compMode === "quality"} onClick={() => setCompMode("quality")}
              className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${compMode === "quality" ? "border-accent bg-accent text-onaccent" : "border-line bg-surface hover:border-accent/50"}`}>
              Quality Slider
            </button>
            <button type="button" role="tab" aria-selected={compMode === "target"} onClick={() => setCompMode("target")}
              className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${compMode === "target" ? "border-accent bg-accent text-onaccent" : "border-line bg-surface hover:border-accent/50"}`}>
              Target Size (KB / MB)
            </button>
          </div>

          {compMode === "quality" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Select id="comp-fmt" label="Output format" value={format} onChange={setFormat} options={[{ value: "auto", label: `Same as original (${LABEL[file.type] ?? ""})` }, { value: "image/webp", label: "WebP (Smallest)" }, { value: "image/jpeg", label: "JPG" }, { value: "image/png", label: "PNG (lossless)" }]} />
              <div>
                <label htmlFor="comp-q" className="label">Quality: {lossless ? "not used for PNG" : `${quality}%`}</label>
                <input id="comp-q" type="range" min={10} max={92} step={2} value={quality} disabled={lossless} onChange={(e) => setQuality(Number(e.target.value))} className="h-11 w-full accent-[rgb(var(--accent))]" />
              </div>
              <NumInput id="comp-w" label="Max width (px, optional)" value={maxW} onChange={setMaxW} hint="Shrinks large images further." />
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-line bg-surface2 p-4">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Quick target sizes">
                {IMG_PRESETS_KB.map((kb) => (
                  <button key={kb} type="button" onClick={() => applyPresetKb(kb)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${Math.abs(targetBytes - kb * 1024) < 512 ? "border-accent bg-accent text-onaccent" : "border-line bg-surface hover:border-accent/50"}`}>
                    {kb} KB
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
                <div>
                  <label htmlFor="img-tgt" className="label">Target size</label>
                  <input id="img-tgt" className="input" type="text" inputMode="decimal" value={targetText} onChange={(e) => onTargetTextChange(e.target.value)} />
                </div>
                <Select id="img-tgt-u" label="Unit" value={targetUnit} onChange={(v) => { const u = v as ImgUnit; setTargetUnit(u); setTargetText(u === "KB" ? String(Math.round(targetBytes / 1024)) : String(Number((targetBytes / IMG_UNIT.MB).toFixed(2)))); }} options={[{ value: "KB", label: "KB" }, { value: "MB", label: "MB" }]} />
                <Select id="img-tgt-fmt" label="Output format" value={format} onChange={setFormat} options={[{ value: "auto", label: `Auto (${file.type === "image/png" ? "WebP" : LABEL[file.type] ?? ""})` }, { value: "image/webp", label: "WebP (Best savings)" }, { value: "image/jpeg", label: "JPG" }]} />
              </div>
              <p className="text-xs text-muted">Automatically finds the highest quality that fits under your {formatBytes(targetBytes)} limit without ever inflating your file.</p>
            </div>
          )}

          {error && <ErrorMsg>{error}</ErrorMsg>}
          <p role="status" aria-live="polite" className="flex min-h-[20px] items-center gap-2 text-sm text-muted">{busy && <Spinner />}{busy ? "Compressing…" : ""}</p>

          {alreadyUnder && !busy && !error && (
            <Result>
              <p className="font-medium">Already under target: your image ({formatBytes(file.size)}) is already smaller than {formatBytes(targetBytes)}. No compression needed!</p>
            </Result>
          )}

          {bloated && !busy && !error && (
            <Result>
              <div className="space-y-3">
                <p className="font-medium">Already well-compressed ({formatBytes(file.size)})</p>
                <p className="text-sm text-muted">At this setting, re-encoding would not make your image smaller. Try lowering the quality slider slightly{outMime !== "image/webp" ? ", or switch to WebP for 25–40% smaller files." : " or entering a smaller max width."}</p>
                {outMime !== "image/webp" && (
                  <button type="button" className="btn-primary !min-h-[38px] text-sm" onClick={() => setFormat("image/webp")}>
                    Switch to WebP for smaller size
                  </button>
                )}
              </div>
            </Result>
          )}

          {out && smaller && !error && (
            <Result>
              <p className="font-medium">
                Smaller by {Math.abs(diff).toFixed(1)}%: {formatBytes(file.size)} → {formatBytes(out.size)}
                {compMode === "target" && targetMet === false ? " (closest achievable readable size)" : ""}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Fig src={preview} alt="Original image" caption={`Original · ${formatBytes(file.size)}`} />
                <Fig src={out.url} alt="Compressed image" caption={`Result (${LABEL[mime] ?? ""}) · ${outDims ? `${outDims[0]}×${outDims[1]}px · ` : ""}${formatBytes(out.size)}`} />
              </div>
              <div className="mt-4"><DownloadList items={dl} label="Download compressed image" /></div>
            </Result>
          )}
        </>
      )}
      <ResetButton onClick={() => { setFormat("auto"); setQuality(78); setMaxW(""); setError(""); setBloated(false); setAlreadyUnder(false); }} />
    </div>
  );
}

/* ---------------- Resizer ---------------- */
export function ImageResizer() {
  const { file, img, preview, error: loadErr, loading, pick, clear } = useImageFile();
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [lock, setLock] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dl, setDl] = useDownloads();
  const [dims, setDims] = useState<[number, number] | null>(null);

  useEffect(() => { if (img) { setW(String(img.width)); setH(String(img.height)); setDl([]); setDims(null); setError(""); } }, [img, setDl]);

  const onW = (v: string) => { setW(v); setDl([]); const n = parseNum(v); if (lock && img && Number.isFinite(n) && n > 0) setH(String(scaleDim(img.height, img.width, n))); };
  const onH = (v: string) => { setH(v); setDl([]); const n = parseNum(v); if (lock && img && Number.isFinite(n) && n > 0) setW(String(scaleDim(img.width, img.height, n))); };
  const percent = (p: number) => { if (!img) return; setDl([]); setW(String(Math.max(1, Math.round((img.width * p) / 100)))); setH(String(Math.max(1, Math.round((img.height * p) / 100)))); };

  const run = async () => {
    if (!file || !img) return;
    setError(""); setDl([]);
    const nw = parseNum(w), nh = parseNum(h);
    if (Number.isNaN(nw) || Number.isNaN(nh)) { setError("Enter a width and a height in pixels."); return; }
    const bad = checkDims(nw, nh);
    if (bad) { setError(bad); return; }
    setBusy(true);
    try {
      const blob = await encodeImage(img, nw, nh, file.type, 0.92);
      setDims([nw, nh]);
      setDl([{ blob, name: `${baseName(file.name)}-${nw}x${nh}.${EXT[file.type] ?? "img"}` }]);
    } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  const out = dl[0];
  const upscaled = img && Number(w) > img.width;

  return (
    <div className="space-y-4">
      {!file ? <Dropzone id="resize-file" label="Choose an image or drop it here" hint={`JPG, PNG or WebP, up to ${limitLabel(MAX_IMAGE_BYTES)}.`} accept="image/jpeg,image/png,image/webp" onFiles={pick} />
        : <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg p-3"><p className="min-w-0 break-all text-sm"><strong>{file.name}</strong><span className="text-muted"> · {formatBytes(file.size)}{img ? ` · ${img.width}×${img.height}px` : ""}</span></p><button type="button" className="btn-ghost shrink-0" onClick={() => { clear(); setDl([]); setW(""); setH(""); }}>Replace image</button></div>}
      {loading && <p role="status" className="text-sm text-muted">Reading image…</p>}
      {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      {file && img && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumInput id="rs-w" label="Width (px)" value={w} onChange={onW} />
            <NumInput id="rs-h" label="Height (px)" value={h} onChange={onH} />
          </div>
          <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={lock} onChange={(e) => setLock(e.target.checked)} />Keep aspect ratio</label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick sizes">
            {[25, 50, 75].map((p) => <button key={p} type="button" className="chip" onClick={() => percent(p)}>{p}%</button>)}
            <button type="button" className="chip" onClick={() => percent(100)}>Original</button>
          </div>
          {upscaled && <p className="text-sm text-muted">Making an image larger cannot add detail, so it may look soft.</p>}
          <p className="text-xs text-muted">The output keeps the original format ({LABEL[file.type]}). JPG and WebP are saved at 92% quality, so file size can change.</p>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary" disabled={busy} onClick={run}>{busy ? "Working…" : "Resize image"}</button><ResetButton onClick={() => { percent(100); setError(""); }} /></div>
          {out && dims && (
            <Result>
              <p className="font-medium">Done: {img.width}×{img.height}px → {dims[0]}×{dims[1]}px · {formatBytes(file.size)} → {formatBytes(out.size)}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Fig src={preview} alt="Original image" caption={`Original · ${img.width}×${img.height}px`} />
                <Fig src={out.url} alt="Resized image" caption={`Resized · ${dims[0]}×${dims[1]}px`} />
              </div>
              <div className="mt-4"><DownloadList items={dl} /></div>
            </Result>
          )}
        </>
      )}
    </div>
  );
}
