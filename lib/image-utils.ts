export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome/.test(ua);
}

async function nativeHeicDecode(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const MAX_DIM = 4096;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > MAX_DIM || h > MAX_DIM) {
          const scale = MAX_DIM / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas context unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            canvas.width = 0;
            canvas.height = 0;
            URL.revokeObjectURL(url);
            if (blob && blob.size > 0) {
              resolve(blob);
            } else {
              reject(new Error("Canvas export failed"));
            }
          },
          "image/jpeg",
          0.92
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Browser cannot decode HEIC natively"));
    };
    img.src = url;
  });
}

async function serverHeicConvert(file: File): Promise<Blob> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/convert-heic", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Server error" }));
    throw new Error(err.error || "Server conversion failed");
  }
  return res.blob();
}

export async function convertHeicToJpeg(file: File): Promise<Blob> {
  if (isSafari()) {
    try {
      return await nativeHeicDecode(file);
    } catch {}
  }
  try {
    return await serverHeicConvert(file);
  } catch {
    const mod = await import("heic2any");
    const heic2any = mod.default || mod;
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    if (Array.isArray(result)) return result[0];
    return result;
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export function drawToCanvas(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot get 2d context");
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  return canvas;
}

export function downscaleImage(
  img: HTMLImageElement,
  maxDim: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
  let { naturalWidth: w, naturalHeight: h } = img;
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const canvas = drawToCanvas(img, w, h);
  return { canvas, width: w, height: h };
}

export function getImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot get 2d context");
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function applyGrayscale(d: Uint8ClampedArray): void {
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = gray;
    d[i + 1] = gray;
    d[i + 2] = gray;
  }
}

export function applyContrast(d: Uint8ClampedArray): void {
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }
  const range = max - min || 1;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = ((d[i] - min) / range) * 255;
    d[i + 1] = ((d[i + 1] - min) / range) * 255;
    d[i + 2] = ((d[i + 2] - min) / range) * 255;
  }
}

export function applyBinarize(
  d: Uint8ClampedArray,
  width: number,
  height: number
): void {
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }
  const threshold = sum / (width * height);
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = lum > threshold ? 255 : 0;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
}

export function rotateCanvas(
  sourceCanvas: HTMLCanvasElement,
  degrees: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceCanvas;
  const { width: w, height: h } = sourceCanvas;

  if (degrees === 90 || degrees === 270) {
    canvas.width = h;
    canvas.height = w;
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(sourceCanvas, -w / 2, -h / 2);
  return canvas;
}

export function centerCrop(
  sourceCanvas: HTMLCanvasElement,
  cropRatio: number = 0.8
): HTMLCanvasElement {
  const { width: w, height: h } = sourceCanvas;
  const cw = Math.round(w * cropRatio);
  const ch = Math.round(h * cropRatio);
  const sx = Math.round((w - cw) / 2);
  const sy = Math.round((h - ch) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceCanvas;
  ctx.drawImage(sourceCanvas, sx, sy, cw, ch, 0, 0, cw, ch);
  return canvas;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
