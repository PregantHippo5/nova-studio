// lib/novaia/image.ts
//
// Préparation d'une image dans le NAVIGATEUR avant l'envoi : redressement (orientation EXIF), réduction à 1600 px,
// recompression JPEG pour tenir dans la limite du serveur. Rien n'est enregistré : l'image n'existe qu'en mémoire.

export interface PreparedImage {
  dataUrl: string; // envoyé au serveur
  thumb: string; // petite vignette pour l'aperçu
}

export const MAX_SIDE = 1600;
export const MAX_DATAURL_CHARS = 1_300_000; // < limite du serveur (1,8 Mo de corps)
const MAX_FILE_BYTES = 20_000_000;

type Source = { width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; close: () => void };

async function open(file: File): Promise<Source> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { width: bmp.width, height: bmp.height, draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h), close: () => bmp.close() };
    } catch {
      /* repli ci-dessous */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode'));
      img.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      close: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function render(src: Source, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#fff'; // PNG transparents : fond blanc
  ctx.fillRect(0, 0, w, h);
  src.draw(ctx, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

/** Lance une erreur si le fichier n'est pas une image lisible (ex. HEIC sur Chrome) ou reste trop lourd. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/') || file.size > MAX_FILE_BYTES) throw new Error('type');
  const src = await open(file);
  try {
    let side = MAX_SIDE;
    let dataUrl = '';
    for (const q of [0.88, 0.8, 0.7, 0.6, 0.5]) {
      dataUrl = render(src, side, q);
      if (dataUrl.length <= MAX_DATAURL_CHARS) break;
      side = Math.round(side * 0.85);
    }
    if (dataUrl.length > MAX_DATAURL_CHARS) throw new Error('size');
    return { dataUrl, thumb: render(src, 96, 0.7) };
  } finally {
    src.close();
  }
}
