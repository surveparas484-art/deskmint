// Browser-only image helpers built on the Canvas API.
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
export const MAX_SIDE = 10000;
export const MAX_PIXELS = 40_000_000; // keeps canvas allocation within what most phones can handle
export const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const LABEL: Record<string, string> = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP" };

export function checkImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return `${file.name} is not supported. Use a JPG, PNG or WebP image.`;
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name} is larger than the 50 MB limit for this tool.`;
  return null;
}

export interface LoadedImage { source: CanvasImageSource; width: number; height: number; close: () => void }

export async function loadImage(file: File): Promise<LoadedImage> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  } catch { /* fall back to an <img> element below */ }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } catch {
    throw new Error(`${file.name} could not be read as an image. It may be damaged.`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function checkDims(w: number, h: number): string | null {
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1) return "Width and height must be whole numbers of at least 1 pixel.";
  if (w > MAX_SIDE || h > MAX_SIDE) return `Width and height cannot exceed ${MAX_SIDE.toLocaleString("en-US")} pixels.`;
  if (w * h > MAX_PIXELS) return "That size has too many pixels for a browser to handle reliably. Choose smaller dimensions.";
  return null;
}

export async function encodeImage(img: LoadedImage, w: number, h: number, mime: string, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not create a drawing surface.");
  if (mime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); } // JPG has no transparency
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img.source, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, mime === "image/png" ? undefined : quality));
  canvas.width = 0; canvas.height = 0;
  if (!blob) throw new Error("The browser could not encode the image. It may be too large for this device.");
  if (blob.type !== mime) throw new Error(`This browser cannot create ${LABEL[mime] ?? mime} files. Choose another format.`);
  return blob;
}
