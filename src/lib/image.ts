/**
 * Normalização de imagens de upload no client ANTES de inserir no canvas.
 *
 * Objetivos de performance (seção 2 do hand-off):
 *  - Limitar o maior lado a ~2000px (evita texturas gigantes na GPU).
 *  - Decodificar fora da main thread com `createImageBitmap` quando possível.
 *  - Retornar um dataURL leve (PNG/JPEG) para serializar no design.
 */

const MAX_SIDE = 2000;

export interface NormalizedImage {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

export async function normalizeImageFile(file: File): Promise<NormalizedImage> {
  const bitmap = await decode(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_SIDE);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Canvas 2D indisponível');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);

  // Libera o bitmap o quanto antes (evita reter memória de GPU).
  if ('close' in bitmap) bitmap.close();

  // PNG preserva transparência (logos costumam ter fundo transparente).
  const dataUrl = canvas.toDataURL('image/png');
  const blob = await canvasToBlob(canvas);
  return { dataUrl, blob, width, height };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob falhou'))),
      'image/png',
    );
  });
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* alguns formatos falham no createImageBitmap; cai no <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fitWithin(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w > h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

/**
 * Cache de imagens já decodificadas (Map src -> HTMLImageElement).
 * Evita re-decodificar a mesma imagem-base/logo a cada render do Fabric.
 */
const imageCache = new Map<string, HTMLImageElement>();

export function loadImageCached(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

export function clearImageFromCache(src: string) {
  imageCache.delete(src);
}
