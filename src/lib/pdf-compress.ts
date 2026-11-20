// Adaptive "target size" PDF compression (browser only).
// Strategy 1 (text-preserving): re-encode embedded JPEG (DCTDecode) images at a lower resolution/quality, leaving text, vectors and
// everything else untouched. A bisection search finds the gentlest setting that reaches the target.
// Strategy 2 (opt-in): render pages to images. Text becomes non-selectable, so it is never used unless the user allows it.
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, type PDFRef } from "pdf-lib";
import { buildPdfFromJpegs, optimizePdf, loadPdf } from "./pdf-ops";

export const MIN_SCALE = 0.35; // images are never reduced below 35% of their original width/height
export const MIN_QUALITY = 0.35; // nor below 35% JPEG quality
export const MIN_IMAGE_BYTES = 8 * 1024; // smaller images are not worth re-encoding
export const MAX_RASTER_PAGES = 50;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const imageParams = (t: number) => ({ scale: lerp(1, MIN_SCALE, t), quality: lerp(0.9, MIN_QUALITY, t) });
export const rasterParams = (u: number) => ({ dpi: Math.round(lerp(150, 60, u)), quality: lerp(0.8, 0.4, u) });

export interface ImageInfo { ref: PDFRef; width: number; height: number; bytes: number }
export interface Analysis { fileSize: number; pageCount: number; jpegImages: number; jpegBytes: number; otherImages: number; imageShare: number }

const NAME = (s: string) => PDFName.of(s);
const num = (d: PDFDict, k: string) => { const v = d.lookup(NAME(k)); return v instanceof PDFNumber ? v.asNumber() : 0; };
const isDct = (d: PDFDict) => {
  const f = d.lookup(NAME("Filter"));
  if (f === NAME("DCTDecode")) return true;
  return f instanceof PDFArray && f.size() === 1 && f.lookup(0) === NAME("DCTDecode");
};

export function findImages(doc: PDFDocument): { jpeg: ImageInfo[]; other: number } {
  const jpeg: ImageInfo[] = [];
  let other = 0;
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const d = obj.dict;
    if (d.lookup(NAME("Subtype")) !== NAME("Image")) continue;
    const stencil = d.lookup(NAME("ImageMask")); // stencil masks and colour-key masks are left alone
    if ((stencil && String(stencil) === "true") || d.has(NAME("Mask"))) { other++; continue; }
    if (isDct(d)) jpeg.push({ ref, width: num(d, "Width"), height: num(d, "Height"), bytes: obj.getContents().length });
    else other++;
  }
  return { jpeg, other };
}

export async function analyzePdf(bytes: ArrayBuffer, label: string): Promise<Analysis> {
  const doc = await loadPdf(bytes, label);
  const { jpeg, other } = findImages(doc);
  const jpegBytes = jpeg.reduce((s, i) => s + i.bytes, 0);
  return { fileSize: bytes.byteLength, pageCount: doc.getPageCount(), jpegImages: jpeg.length, jpegBytes, otherImages: other, imageShare: jpegBytes / Math.max(1, bytes.byteLength) };
}

const SKIP_KEYS = new Set(["Filter", "DecodeParms", "Decode", "ColorSpace", "Width", "Height", "BitsPerComponent", "Length"]);

/** Re-encodes eligible JPEG images in `doc` (in place). Only replaces an image when the new data is smaller. */
async function recompressImages(doc: PDFDocument, scale: number, quality: number): Promise<{ replaced: number }> {
  let replaced = 0;
  for (const info of findImages(doc).jpeg) {
    if (info.bytes < MIN_IMAGE_BYTES || info.width < 32 || info.height < 32) continue;
    const stream = doc.context.lookup(info.ref) as PDFRawStream;
    const src = stream.getContents();
    let bmp: ImageBitmap | null = null;
    try {
      bmp = await createImageBitmap(new Blob([src as unknown as BlobPart], { type: "image/jpeg" }));
      const w = Math.max(16, Math.round(info.width * scale)), h = Math.max(16, Math.round(info.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
      canvas.width = 0; canvas.height = 0;
      if (!blob) continue;
      const out = new Uint8Array(await blob.arrayBuffer());
      if (out.length >= src.length) continue; // never make an image bigger
      const nd = PDFDict.withContext(doc.context);
      for (const [k, v] of stream.dict.entries()) if (!SKIP_KEYS.has(k.decodeText())) nd.set(k, v); // keeps SMask, Intent, etc.
      nd.set(NAME("Width"), PDFNumber.of(w)); nd.set(NAME("Height"), PDFNumber.of(h));
      nd.set(NAME("ColorSpace"), NAME("DeviceRGB")); nd.set(NAME("BitsPerComponent"), PDFNumber.of(8)); nd.set(NAME("Filter"), NAME("DCTDecode"));
      doc.context.assign(info.ref, PDFRawStream.of(nd, out));
      replaced++;
    } catch { /* undecodable image: leave it as it is */ } finally { bmp?.close(); }
  }
  return { replaced };
}

export interface Attempt { bytes: Uint8Array; size: number; replaced: number; scale?: number; quality?: number; dpi?: number }
export interface TargetResult {
  bytes: Uint8Array | null; size: number; met: boolean; alreadyUnder: boolean;
  method: "none" | "images" | "raster" | "structure"; textPreserved: boolean;
  attempts: number; replaced: number; stoppedEarly: boolean; analysis: Analysis; reason: string;
  scale?: number; quality?: number; dpi?: number;
}
export interface TargetOptions { allowRaster: boolean; onProgress?: (m: string) => void; cancelled?: () => boolean; maxMs?: number }

export async function compressToTarget(bytes: ArrayBuffer, target: number, label: string, opts: TargetOptions): Promise<TargetResult> {
  const say = opts.onProgress ?? (() => {});
  const started = Date.now();
  const timeUp = () => Date.now() - started > (opts.maxMs ?? 90_000) || !!opts.cancelled?.();
  const analysis = await analyzePdf(bytes, label);
  const base = { analysis, attempts: 0, replaced: 0, stoppedEarly: false };
  if (analysis.fileSize <= target) return { ...base, bytes: null, size: analysis.fileSize, met: true, alreadyUnder: true, method: "none", textPreserved: true, reason: "The file is already at or below the target size." };

  let attempts = 0, stoppedEarly = false;
  let best: (Attempt & { method: "images" | "raster" | "structure" }) | null = null; // best attempt that meets the target = largest (highest quality)
  let closest: (Attempt & { method: "images" | "raster" | "structure" }) | null = null; // smallest attempt overall
  const consider = (a: Attempt, method: "images" | "raster" | "structure") => {
    const x = { ...a, method };
    if (!closest || x.size < closest.size) closest = x;
    if (x.size <= target && (!best || x.size > best.size)) best = x;
    return x.size <= target;
  };

  // ---- Strategy 1: recompress embedded JPEG images (text and vectors preserved)
  if (analysis.jpegImages > 0) {
    const tryImages = async (t: number): Promise<boolean> => {
      attempts++;
      const { scale, quality } = imageParams(t);
      say(`Trying image settings ${attempts}: ${Math.round(scale * 100)}% size, ${Math.round(quality * 100)}% quality…`);
      const doc = await loadPdf(bytes, label);
      const { replaced } = await recompressImages(doc, scale, quality);
      const out = await doc.save({ useObjectStreams: true });
      return consider({ bytes: out, size: out.length, replaced, scale, quality }, "images");
    };
    if (!(await tryImages(0)) && !timeUp()) {
      if (await tryImages(1)) {
        let lo = 0, hi = 1; // lo misses the target, hi meets it
        for (let i = 0; i < 6 && !timeUp(); i++) {
          const mid = (lo + hi) / 2;
          if (await tryImages(mid)) hi = mid; else lo = mid;
        }
      }
    }
    if (timeUp()) stoppedEarly = true;
  } else {
    attempts++;
    const out = await optimizePdf(bytes, label, true);
    consider({ bytes: out, size: out.length, replaced: 0 }, "structure");
  }

  // ---- Strategy 2 (only if the user allowed it): rasterise pages
  const metSoFar = best !== null;
  if (!metSoFar && opts.allowRaster && !stoppedEarly) {
    if (analysis.pageCount > MAX_RASTER_PAGES) {
      say(`Skipping page-image method: it supports up to ${MAX_RASTER_PAGES} pages.`);
    } else {
      const { renderJpegPages } = await import("./pdf-preview");
      const tryRaster = async (u: number): Promise<boolean> => {
        attempts++;
        const { dpi, quality } = rasterParams(u);
        const imgs: { jpeg: Uint8Array; widthPt: number; heightPt: number }[] = [];
        await renderJpegPages(bytes, Array.from({ length: analysis.pageCount }, (_, i) => i + 1), dpi, quality, async (pg) => {
          imgs.push({ jpeg: new Uint8Array(await pg.blob.arrayBuffer()), widthPt: pg.widthPt, heightPt: pg.heightPt });
          say(`Page-image attempt ${attempts}: page ${pg.page} of ${analysis.pageCount} at ${dpi} DPI…`);
        }, () => timeUp());
        if (imgs.length !== analysis.pageCount) return false; // cancelled part-way
        const out = await buildPdfFromJpegs(imgs);
        return consider({ bytes: out, size: out.length, replaced: 0, dpi, quality }, "raster");
      };
      if (await tryRaster(1)) {
        if (!(await tryRaster(0)) && !timeUp()) {
          let lo = 0, hi = 1;
          for (let i = 0; i < 3 && !timeUp(); i++) { const mid = (lo + hi) / 2; if (await tryRaster(mid)) hi = mid; else lo = mid; }
        }
      }
      if (timeUp()) stoppedEarly = true;
    }
  }

  const pick = (best ?? closest) as (Attempt & { method: "images" | "raster" | "structure" }) | null;
  if (!pick) return { ...base, attempts, stoppedEarly, bytes: null, size: analysis.fileSize, met: false, alreadyUnder: false, method: "none", textPreserved: true, reason: "No valid output could be produced." };
  // never hand back something larger than the original
  if (pick.size >= analysis.fileSize) return { ...base, attempts, stoppedEarly, bytes: null, size: analysis.fileSize, met: false, alreadyUnder: false, method: "none", textPreserved: true, reason: "Compression could not make this file smaller without converting pages to images." };
  const reason = pick.method === "raster"
    ? `Pages were converted to images at ${pick.dpi} DPI and ${Math.round((pick.quality ?? 0) * 100)}% quality, so text is no longer selectable.`
    : analysis.jpegImages === 0
      ? "This PDF has no recompressible JPEG images (it is mostly text or vector content)."
      : `Recompressed ${pick.replaced} of ${analysis.jpegImages} JPEG image${analysis.jpegImages === 1 ? "" : "s"}; text and vector content were not changed.`;
  return {
    ...base, attempts, stoppedEarly, bytes: pick.bytes, size: pick.size, met: best !== null, alreadyUnder: false, method: pick.method,
    textPreserved: pick.method !== "raster", replaced: pick.replaced, scale: pick.scale, quality: pick.quality, dpi: pick.dpi, reason,
  };
}
