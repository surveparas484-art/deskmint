// Pure helpers (no browser APIs) shared by the file tools.

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

/** Human label for a byte limit taken from the real config constant, e.g. 100 MB. */
export const limitLabel = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

export const baseName = (n: string) => n.replace(/\.[^.]+$/, "") || "file";

export type RangeResult =
  | { ok: true; pages: number[]; ranges: [number, number][] }
  | { ok: false; error: string };

/** Parses "1-3, 5, 8-10" (1-based). `pages` is de-duplicated in the order typed; `ranges` keeps each typed range. */
export function parseRanges(input: string, max: number): RangeResult {
  const text = input.trim();
  if (!text) return { ok: false, error: "Enter page numbers, for example 1-3, 5, 8-10." };
  const seen = new Set<number>();
  const pages: number[] = [];
  const ranges: [number, number][] = [];
  for (const raw of text.split(",")) {
    const part = raw.trim();
    if (!part) return { ok: false, error: "There is an extra comma in the page list." };
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!m) return { ok: false, error: `"${part}" is not a valid page or range.` };
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : Number(m[2]);
    if (a < 1 || b < 1 || a > max || b > max) return { ok: false, error: `Pages must be between 1 and ${max}. "${part}" is outside that.` };
    if (a > b) return { ok: false, error: `"${part}" counts backwards. Write it as ${b}-${a}.` };
    ranges.push([a, b]);
    for (let p = a; p <= b; p++) if (!seen.has(p)) { seen.add(p); pages.push(p); }
  }
  return { ok: true, pages, ranges };
}

export function formatRanges(pages: number[]): string {
  const s = [...new Set(pages)].sort((a, b) => a - b);
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === (s[j] as number) + 1) j++;
    out.push(i === j ? `${s[i]}` : `${s[i]}-${s[j]}`);
    i = j + 1;
  }
  return out.join(", ");
}

/** Fits (w,h) to a new width or height while keeping the aspect ratio. */
export const scaleDim = (value: number, from: number, to: number) => Math.max(1, Math.round((value * to) / from));

export type PageSizeId = "a4" | "letter" | "fit";
export interface LayoutOptions { size: PageSizeId; orientation: "auto" | "portrait" | "landscape"; margin: number }
export const PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792] } as const;

/** Places an image (pixels) on a PDF page (points), centred and scaled to fit inside the margins. */
export function layoutImage(imgW: number, imgH: number, o: LayoutOptions) {
  if (o.size === "fit") {
    const w = imgW * 0.75, h = imgH * 0.75; // 96 px per inch -> 72 pt per inch
    return { pageW: w + 2 * o.margin, pageH: h + 2 * o.margin, x: o.margin, y: o.margin, w, h };
  }
  let [pw, ph] = PAGE_SIZES[o.size] as readonly [number, number];
  const landscape = o.orientation === "landscape" || (o.orientation === "auto" && imgW > imgH);
  if (landscape) [pw, ph] = [ph, pw];
  const scale = Math.min((pw - 2 * o.margin) / imgW, (ph - 2 * o.margin) / imgH);
  const w = imgW * scale, h = imgH * scale;
  return { pageW: pw, pageH: ph, x: (pw - w) / 2, y: (ph - h) / 2, w, h };
}
