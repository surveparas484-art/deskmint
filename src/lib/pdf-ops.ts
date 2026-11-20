// PDF operations on bytes. Everything runs in the browser through pdf-lib (loaded lazily).
import type { PDFDocument } from "pdf-lib";
import { layoutImage, type LayoutOptions } from "./files";

export const MAX_PDF_BYTES = 100 * 1024 * 1024;

/** Quick checks before reading a whole file. Returns an error message or null. */
export async function checkPdf(file: File): Promise<string | null> {
  if (!(file.type === "application/pdf" || /\.pdf$/i.test(file.name))) return `${file.name} is not a PDF file.`;
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_PDF_BYTES) return `${file.name} is larger than the 100 MB limit for this tool.`;
  const head = new TextDecoder().decode(await file.slice(0, 1024).arrayBuffer());
  if (!head.includes("%PDF-")) return `${file.name} does not look like a valid PDF.`;
  return null;
}

export async function loadPdf(bytes: ArrayBuffer | Uint8Array, label: string): Promise<PDFDocument> {
  const { PDFDocument } = await import("pdf-lib");
  try {
    return await PDFDocument.load(bytes);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    throw new Error(/encrypt/i.test(msg)
      ? `${label} is password-protected. Remove the password first, then try again.`
      : `${label} could not be read. It may be damaged or not a real PDF.`);
  }
}

export async function readPdfFile(file: File) {
  const err = await checkPdf(file);
  if (err) throw new Error(err);
  const bytes = await file.arrayBuffer();
  const doc = await loadPdf(bytes, file.name);
  return { bytes, pageCount: doc.getPageCount() };
}

export const toBlob = async (doc: PDFDocument) => new Blob([(await doc.save()) as unknown as BlobPart], { type: "application/pdf" });

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Appends all pages of each input, in the given order. */
export async function mergePdfs(inputs: { bytes: ArrayBuffer; label: string }[], onProgress?: (done: number) => void): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create();
  let done = 0;
  for (const inp of inputs) {
    const src = await loadPdf(inp.bytes, inp.label);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
    onProgress?.(++done);
    await tick();
  }
  return out.save();
}

/** Creates a new PDF containing the given 1-based pages, in the given order. */
export async function extractPages(bytes: ArrayBuffer, pages: number[], label = "PDF"): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const src = await loadPdf(bytes, label);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pages.map((p) => p - 1));
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

/** Rotates the given 1-based pages clockwise by 90, 180 or 270 degrees, adding to any existing rotation. */
export async function rotatePages(bytes: ArrayBuffer, pages: number[], angle: 90 | 180 | 270, label = "PDF"): Promise<Uint8Array> {
  const { degrees } = await import("pdf-lib");
  const doc = await loadPdf(bytes, label);
  const all = doc.getPages();
  for (const n of pages) {
    const page = all[n - 1];
    if (!page) throw new Error(`Page ${n} does not exist.`);
    page.setRotation(degrees((page.getRotation().angle + angle) % 360));
  }
  return doc.save();
}

/** Removes the given 1-based pages. Refuses to remove every page. */
export async function removePages(bytes: ArrayBuffer, pages: number[], label = "PDF"): Promise<Uint8Array> {
  const doc = await loadPdf(bytes, label);
  const unique = [...new Set(pages)];
  if (unique.length >= doc.getPageCount()) throw new Error("You cannot remove every page. Leave at least one page.");
  for (const n of unique.sort((a, b) => b - a)) doc.removePage(n - 1);
  return doc.save();
}

/** Structural optimisation only: rewrites the file with object streams. Embedded images are NOT recompressed. */
export async function optimizePdf(bytes: ArrayBuffer, label: string, stripMetadata: boolean): Promise<Uint8Array> {
  const doc = await loadPdf(bytes, label);
  if (stripMetadata) { doc.setTitle(""); doc.setAuthor(""); doc.setSubject(""); doc.setKeywords([]); doc.setCreator("DeskMint"); doc.setProducer("DeskMint"); }
  return doc.save({ useObjectStreams: true });
}

export interface PageImage { jpeg: Uint8Array; widthPt: number; heightPt: number }

/** Builds a PDF where every page is one JPEG at the given page size (used by rasterising compression). */
export async function buildPdfFromJpegs(pages: PageImage[]): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  for (const p of pages) {
    const img = await doc.embedJpg(p.jpeg);
    const page = doc.addPage([p.widthPt, p.heightPt]);
    page.drawImage(img, { x: 0, y: 0, width: p.widthPt, height: p.heightPt });
  }
  return doc.save();
}

export interface ImagePdfItem { bytes: Uint8Array; kind: "jpg" | "png"; width: number; height: number }

/** One page per image, laid out by page size, orientation and margin. */
export async function buildImagePdf(items: ImagePdfItem[], opts: LayoutOptions): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  for (const it of items) {
    const L = layoutImage(it.width, it.height, opts);
    const img = it.kind === "png" ? await doc.embedPng(it.bytes) : await doc.embedJpg(it.bytes);
    const page = doc.addPage([L.pageW, L.pageH]);
    page.drawImage(img, { x: L.x, y: L.y, width: L.w, height: L.h });
  }
  return doc.save();
}

/* ---------- page numbers, watermark, organise ---------- */
export type RGB = { r: number; g: number; b: number }; // 0..1

/** Maps a point in the page as displayed (origin bottom-left, after /Rotate) to PDF user space. */
export function visualToUser(rotation: number, W: number, H: number, vx: number, vy: number) {
  const r = ((rotation % 360) + 360) % 360;
  if (r === 90) return { x: W - vy, y: vx };
  if (r === 180) return { x: W - vx, y: H - vy };
  if (r === 270) return { x: vy, y: H - vx };
  return { x: vx, y: vy };
}
export const visualSize = (rotation: number, W: number, H: number) => (((rotation % 360) + 360) % 360 === 90 || ((rotation % 360) + 360) % 360 === 270 ? { vw: H, vh: W } : { vw: W, vh: H });

export interface PageNumberOptions {
  position: "top" | "bottom"; align: "left" | "center" | "right"; startAt: number; firstPage: number;
  fontSize: number; color: RGB; format: string; margin?: number;
}

export async function addPageNumbers(bytes: ArrayBuffer, o: PageNumberOptions, label = "PDF"): Promise<Uint8Array> {
  const { StandardFonts, rgb, degrees } = await import("pdf-lib");
  const doc = await loadPdf(bytes, label);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const margin = o.margin ?? 36;
  for (let i = o.firstPage - 1; i < pages.length; i++) {
    const page = pages[i] as (typeof pages)[number];
    const n = o.startAt + (i - (o.firstPage - 1));
    const text = o.format.replace(/\{n\}/g, String(n)).replace(/\{total\}/g, String(o.startAt + pages.length - o.firstPage));
    let width: number;
    try { width = font.widthOfTextAtSize(text, o.fontSize); }
    catch { throw new Error("The number format contains characters that cannot be used. Use letters, digits and common punctuation only."); }
    const rot = page.getRotation().angle;
    const box = page.getMediaBox();
    const { vw, vh } = visualSize(rot, box.width, box.height);
    const vx = o.align === "left" ? margin : o.align === "center" ? (vw - width) / 2 : vw - margin - width;
    const vy = o.position === "bottom" ? margin : vh - margin - o.fontSize * 0.75;
    const p = visualToUser(rot, box.width, box.height, vx, vy);
    page.drawText(text, { x: box.x + p.x, y: box.y + p.y, size: o.fontSize, font, color: rgb(o.color.r, o.color.g, o.color.b), rotate: degrees(rot) });
  }
  return doc.save();
}

export type WatermarkPosition = "top-left" | "top-center" | "top-right" | "middle-left" | "center" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right";
export interface WatermarkOptions {
  text?: string; image?: { bytes: Uint8Array; kind: "png" | "jpg"; width: number; height: number }; imageWidthPct?: number;
  fontSize: number; color: RGB; opacity: number; rotation: number; position: WatermarkPosition; pages: number[]; margin?: number;
}

export async function addWatermark(bytes: ArrayBuffer, o: WatermarkOptions, label = "PDF"): Promise<Uint8Array> {
  const { StandardFonts, rgb, degrees } = await import("pdf-lib");
  if (!o.text && !o.image) throw new Error("Enter watermark text or choose an image.");
  const doc = await loadPdf(bytes, label);
  const font = o.text ? await doc.embedFont(StandardFonts.HelveticaBold) : null;
  const img = o.image ? (o.image.kind === "png" ? await doc.embedPng(o.image.bytes) : await doc.embedJpg(o.image.bytes)) : null;
  const all = doc.getPages();
  const a = (o.rotation * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  const margin = o.margin ?? 36;
  for (const n of o.pages) {
    const page = all[n - 1];
    if (!page) throw new Error(`Page ${n} does not exist.`);
    const rot = page.getRotation().angle;
    const box = page.getMediaBox();
    const { vw, vh } = visualSize(rot, box.width, box.height);
    let w: number, h: number;
    if (img && o.image) { w = vw * ((o.imageWidthPct ?? 40) / 100); h = (w * o.image.height) / o.image.width; }
    else { try { w = (font as NonNullable<typeof font>).widthOfTextAtSize(o.text as string, o.fontSize); } catch { throw new Error("Text watermarks support Latin letters, digits and common punctuation. Use an image watermark for other scripts."); } h = o.fontSize; }
    const col = o.position.endsWith("left") ? "l" : o.position.endsWith("right") ? "r" : "c";
    const row = o.position.startsWith("top") ? "t" : o.position.startsWith("bottom") ? "b" : "m";
    const cx = col === "l" ? margin + w / 2 : col === "r" ? vw - margin - w / 2 : vw / 2;
    const cy = row === "t" ? vh - margin - h / 2 : row === "b" ? margin + h / 2 : vh / 2;
    // offset from the drawing origin (text baseline-left / image lower-left) to the visual centre
    const ox = w / 2, oy = img ? h / 2 : o.fontSize * 0.35;
    const sx = cx - (ox * cos - oy * sin), sy = cy - (ox * sin + oy * cos);
    const p = visualToUser(rot, box.width, box.height, sx, sy);
    const common = { x: box.x + p.x, y: box.y + p.y, opacity: o.opacity, rotate: degrees(o.rotation + rot) };
    if (img) page.drawImage(img, { ...common, width: w, height: h });
    else page.drawText(o.text as string, { ...common, size: o.fontSize, font: font as NonNullable<typeof font>, color: rgb(o.color.r, o.color.g, o.color.b) });
  }
  return doc.save();
}

/** Builds a new PDF from `plan` (original 1-based page numbers, in the new order) with extra clockwise rotation per page. */
export async function organizePages(bytes: ArrayBuffer, plan: { page: number; rotate: number }[], label = "PDF"): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await import("pdf-lib");
  if (plan.length === 0) throw new Error("Keep at least one page.");
  const src = await loadPdf(bytes, label);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, plan.map((p) => p.page - 1));
  copied.forEach((pg, i) => {
    const extra = (plan[i] as (typeof plan)[number]).rotate;
    if (extra) pg.setRotation(degrees((pg.getRotation().angle + extra) % 360));
    out.addPage(pg);
  });
  return out.save();
}
