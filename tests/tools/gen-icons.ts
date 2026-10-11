/**
 * Generates the PWA / apple-touch icons as PNGs into public/. Placeholder art
 * (navy field + two interlocking sky rings = "link"); swap for real art later.
 * Run with `npm run gen:icons`. No image libs — hand-rolls a minimal PNG.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const NAVY: [number, number, number] = [0x0f, 0x17, 0x2a];
const SKY: [number, number, number] = [0x38, 0xbd, 0xf8];

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes, 0);
  body.set(data, typeBytes.length);
  const len = data.length;
  const out = new Uint8Array(8 + body.length + 4);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, len);
  out.set(body, 4);
  dv.setUint32(4 + body.length, crc32(body));
  return out;
}

function encodePng(size: number): Uint8Array {
  // Build raw RGB scanlines (filter byte 0 per row).
  const row = size * 3 + 1;
  const raw = new Uint8Array(row * size);
  const cx1 = size * 0.4;
  const cx2 = size * 0.6;
  const cy = size * 0.5;
  const rOuter = size * 0.22;
  const thick = size * 0.07;

  const inRing = (x: number, y: number, cx: number): boolean => {
    const d = Math.hypot(x - cx, y - cy);
    return d < rOuter && d > rOuter - thick;
  };

  for (let y = 0; y < size; y++) {
    raw[y * row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] =
        inRing(x, y, cx1) || inRing(x, y, cx2) ? SKY : NAVY;
      const o = y * row + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }

  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, size);
  dv.setUint32(4, size);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    png.set(p, off);
    off += p.length;
  }
  return png;
}

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', '..', 'public');
mkdirSync(publicDir, { recursive: true });

const targets: { name: string; size: number }[] = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];
for (const t of targets) {
  writeFileSync(join(publicDir, t.name), encodePng(t.size));
  console.log(`wrote public/${t.name}`);
}
