// Pure crop geometry in image pixel coordinates.
export interface Rect { x: number; y: number; w: number; h: number }
export type Corner = "nw" | "ne" | "sw" | "se";
const r0 = (r: Rect): Rect => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });

export function clampRect(r: Rect, W: number, H: number, min = 8): Rect {
  const w = Math.min(Math.max(r.w, min), W), h = Math.min(Math.max(r.h, min), H);
  return r0({ x: Math.min(Math.max(r.x, 0), W - w), y: Math.min(Math.max(r.y, 0), H - h), w, h });
}

export const moveRect = (r: Rect, dx: number, dy: number, W: number, H: number): Rect => clampRect({ ...r, x: r.x + dx, y: r.y + dy }, W, H, 1);

/** Largest centred rectangle with aspect ratio `ratio` (w/h), scaled by `fill` (0..1). */
export function fitRatio(W: number, H: number, ratio: number, fill = 0.9): Rect {
  let w = W, h = W / ratio;
  if (h > H) { h = H; w = H * ratio; }
  w *= fill; h *= fill;
  return r0({ x: (W - w) / 2, y: (H - h) / 2, w, h });
}

/** Drags `corner` to pointer (px, py); the opposite corner stays fixed. `ratio` (w/h) locks the aspect. */
export function resizeCorner(r: Rect, corner: Corner, px: number, py: number, W: number, H: number, ratio: number | null, min = 8): Rect {
  const ax = corner === "nw" || corner === "sw" ? r.x + r.w : r.x; // anchor = opposite corner
  const ay = corner === "nw" || corner === "ne" ? r.y + r.h : r.y;
  const dx = px - ax, dy = py - ay;
  const left = dx < 0, up = dy < 0;
  let w = Math.min(Math.abs(dx), left ? ax : W - ax);
  let h = Math.min(Math.abs(dy), up ? ay : H - ay);
  if (ratio) { w = Math.min(w, h * ratio); h = w / ratio; }
  if (w < min) { w = min; if (ratio) h = w / ratio; }
  if (h < min) { h = min; if (ratio) w = h * ratio; }
  const x = left ? ax - w : ax, y = up ? ay - h : ay;
  return clampRect({ x, y, w, h }, W, H, 1);
}
