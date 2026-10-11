export const MAX_IMAGES = 10;
const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.8;

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
// Some browsers leave the MIME type empty for HEIC, so fall back to the name.
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;

export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function checkImageFile(file: { name: string; type: string }): boolean {
  if (file.type !== '') return ALLOWED_TYPES.has(file.type.toLowerCase());
  return ALLOWED_EXTENSIONS.test(file.name);
}

/** Always re-encodes to JPEG: converts HEIC and drops EXIF (location etc.). */
export async function downscaleToJpeg(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
        'image/jpeg',
        JPEG_QUALITY,
      );
    });
  } finally {
    bitmap.close();
  }
}
