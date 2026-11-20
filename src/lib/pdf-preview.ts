// pdf.js helpers (legacy build for wider browser support). Loaded lazily; failures are non-fatal for previews.
async function openPdf(bytes: ArrayBuffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  return pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
}

export async function renderThumbnails(bytes: ArrayBuffer, limit: number, onThumb: (page: number, dataUrl: string) => void, cancelled: () => boolean, width = 160): Promise<void> {
  const pdf = await openPdf(bytes);
  try {
    const n = Math.min(pdf.numPages, limit);
    for (let i = 1; i <= n; i++) {
      if (cancelled()) break;
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / base.width });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      onThumb(i, canvas.toDataURL("image/jpeg", 0.7));
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }
}

export interface RenderedPage { page: number; blob: Blob; widthPx: number; heightPx: number; widthPt: number; heightPt: number }
export const MAX_RENDER_PIXELS = 40_000_000;

/** Renders the given 1-based pages to JPEG at `dpi` (PDF points are 1/72 inch). Pages are rendered one at a time to limit memory. */
export async function renderJpegPages(
  bytes: ArrayBuffer, pages: number[], dpi: number, quality: number,
  onPage: (p: RenderedPage) => void | Promise<void>, cancelled: () => boolean,
): Promise<void> {
  const pdf = await openPdf(bytes);
  try {
    for (const n of pages) {
      if (cancelled()) break;
      const page = await pdf.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: dpi / 72 });
      const w = Math.ceil(viewport.width), h = Math.ceil(viewport.height);
      if (w * h > MAX_RENDER_PIXELS) throw new Error(`Page ${n} is too large to render at ${dpi} DPI. Choose a lower resolution.`);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
      canvas.width = 0; canvas.height = 0;
      page.cleanup();
      if (!blob) throw new Error(`Page ${n} could not be converted. It may be too large for this device.`);
      await onPage({ page: n, blob, widthPx: w, heightPx: h, widthPt: base.width, heightPt: base.height });
    }
  } finally {
    await pdf.destroy();
  }
}

export interface ExtractedText { text: string; pagesRead: number; totalPages: number; truncated: boolean; likelyScanned: boolean }

/** Extracts the text layer of a PDF (no OCR). Stops after `maxChars` characters or `maxPages` pages. */
export async function extractPdfText(bytes: ArrayBuffer, maxChars: number, maxPages = 150): Promise<ExtractedText> {
  const pdf = await openPdf(bytes);
  try {
    const parts: string[] = [];
    let len = 0, pagesRead = 0, truncated = false;
    const limit = Math.min(pdf.numPages, maxPages);
    for (let i = 1; i <= limit; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      let s = "";
      for (const it of tc.items) { if ("str" in it) { s += it.str; s += it.hasEOL ? "\n" : " "; } }
      page.cleanup();
      pagesRead++;
      s = s.replace(/[ \t]+\n/g, "\n").replace(/ {2,}/g, " ").trim();
      if (s) { parts.push(s); len += s.length + 2; }
      if (len >= maxChars) { truncated = i < pdf.numPages || len > maxChars; break; }
    }
    if (pagesRead < pdf.numPages && !truncated) truncated = true;
    let text = parts.join("\n\n");
    if (text.length > maxChars) { text = text.slice(0, maxChars); truncated = true; }
    return { text, pagesRead, totalPages: pdf.numPages, truncated, likelyScanned: text.replace(/\s/g, "").length < 40 * pagesRead };
  } finally { await pdf.destroy(); }
}
