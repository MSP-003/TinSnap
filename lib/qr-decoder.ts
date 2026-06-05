import jsQR from "jsqr";
import {
  loadImage,
  downscaleImage,
  getImageData,
  rotateCanvas,
  centerCrop,
  applyGrayscale,
  applyContrast,
  applyBinarize,
} from "./image-utils";

interface DecodeResult {
  success: boolean;
  data: string | null;
  error: string | null;
}

const MAX_SCAN_DIM = 1000;

function freeCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

function yieldToGC(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

function tryDecodeRaw(
  data: Uint8ClampedArray,
  width: number,
  height: number
): string | null {
  try {
    const result = jsQR(data, width, height, {
      inversionAttempts: "attemptBoth",
    });
    return result?.data || null;
  } catch {
    return null;
  }
}

function tryWithPreprocessing(canvas: HTMLCanvasElement): string | null {
  try {
    const { width, height } = canvas;
    const imageData = getImageData(canvas);
    const original = imageData.data;

    let result = tryDecodeRaw(original, width, height);
    if (result) return result;

    const buf = new Uint8ClampedArray(original);

    applyGrayscale(buf);
    result = tryDecodeRaw(buf, width, height);
    if (result) return result;

    buf.set(original);
    applyContrast(buf);
    result = tryDecodeRaw(buf, width, height);
    if (result) return result;

    buf.set(original);
    applyBinarize(buf, width, height);
    result = tryDecodeRaw(buf, width, height);
    if (result) return result;

    return null;
  } catch {
    return null;
  }
}

function scaleCanvas(
  source: HTMLCanvasElement,
  maxDim: number
): HTMLCanvasElement | null {
  let w = source.width;
  let h = source.height;
  if (w <= maxDim && h <= maxDim) return null;
  const scale = maxDim / Math.max(w, h);
  w = Math.round(w * scale);
  h = Math.round(h * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  return c;
}

function extractRegion(
  source: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): HTMLCanvasElement | null {
  const c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
  return c;
}

export async function decodeQrFromUrl(
  objectUrl: string
): Promise<DecodeResult> {
  let sourceCanvas: HTMLCanvasElement | null = null;

  try {
    const img = await loadImage(objectUrl);
    const { canvas } = downscaleImage(img, MAX_SCAN_DIM);
    sourceCanvas = canvas;

    let data = tryWithPreprocessing(sourceCanvas);
    if (data) {
      freeCanvas(sourceCanvas);
      return { success: true, data, error: null };
    }

    await yieldToGC();

    const small = scaleCanvas(sourceCanvas, 600);
    if (small) {
      data = tryWithPreprocessing(small);
      freeCanvas(small);
      if (data) {
        freeCanvas(sourceCanvas);
        return { success: true, data, error: null };
      }
    }

    await yieldToGC();

    for (const deg of [90, 180, 270]) {
      const rotated = rotateCanvas(sourceCanvas, deg);
      data = tryWithPreprocessing(rotated);
      freeCanvas(rotated);
      if (data) {
        freeCanvas(sourceCanvas);
        return { success: true, data, error: null };
      }
      await yieldToGC();
    }

    const cropped = centerCrop(sourceCanvas, 0.7);
    data = tryWithPreprocessing(cropped);
    freeCanvas(cropped);
    if (data) {
      freeCanvas(sourceCanvas);
      return { success: true, data, error: null };
    }

    await yieldToGC();

    const { width: w, height: h } = sourceCanvas;
    const hw = Math.round(w * 0.55);
    const hh = Math.round(h * 0.55);
    const regions = [
      { sx: 0, sy: 0, sw: hw, sh: hh },
      { sx: w - hw, sy: 0, sw: hw, sh: hh },
      { sx: 0, sy: h - hh, sw: hw, sh: hh },
      { sx: w - hw, sy: h - hh, sw: hw, sh: hh },
    ];

    for (const { sx, sy, sw, sh } of regions) {
      const quad = extractRegion(sourceCanvas, sx, sy, sw, sh);
      if (!quad) continue;
      data = tryWithPreprocessing(quad);
      freeCanvas(quad);
      if (data) {
        freeCanvas(sourceCanvas);
        return { success: true, data, error: null };
      }
      await yieldToGC();
    }

    freeCanvas(sourceCanvas);
    sourceCanvas = null;
    return { success: false, data: null, error: null };
  } catch (err) {
    if (sourceCanvas) freeCanvas(sourceCanvas);
    const message =
      err instanceof Error ? err.message : "Unknown decode error";
    return { success: false, data: null, error: message };
  }
}

export type { DecodeResult };
