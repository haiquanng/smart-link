/**
 * Renders the Smart Link logo (coral tile, two white chain links) into every
 * icon the app and the Chrome extension ship, from one SVG source. Chromium
 * (Playwright, already a dev dependency) does the rasterizing.
 * Run with `npm run gen:icons` after changing the logo.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CORAL = '#e4572e';
// Lucide's "link" glyph (24px grid), drawn in white on the tile.
const LINK = [
  'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
  'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
];

interface Variant {
  /** Rounded tile for favicon/extension/PWA "any"; square for OS masks (iOS, Android maskable). */
  rounded: boolean;
  /** Glyph size; maskable icons keep it inside the 80% safe circle. */
  scale: number;
  /** Thicker lines keep the 16px toolbar icon legible. */
  stroke: number;
}

const TILE: Variant = { rounded: true, scale: 3.6, stroke: 2.6 };
const TILE_SMALL: Variant = { rounded: true, scale: 3.6, stroke: 3.2 };
const SQUARE: Variant = { rounded: false, scale: 3.6, stroke: 2.6 };
const MASKABLE: Variant = { rounded: false, scale: 3.0, stroke: 2.6 };

function logoSvg(v: Variant, size?: number): string {
  const dims = size ? ` width="${size}" height="${size}"` : '';
  const paths = LINK.map((d) => `<path d="${d}"/>`).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"${dims}>` +
    `<rect width="128" height="128" rx="${v.rounded ? 30 : 0}" fill="${CORAL}"/>` +
    `<g transform="translate(64 64) scale(${v.scale}) translate(-12 -12)" fill="none" stroke="#fff" ` +
    `stroke-width="${v.stroke}" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>\n`
  );
}

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const PNGS: [file: string, size: number, variant: Variant][] = [
  ['public/pwa-192x192.png', 192, TILE],
  ['public/pwa-512x512.png', 512, TILE],
  ['public/maskable-512x512.png', 512, MASKABLE],
  // iOS rounds the corners itself and turns transparency black: full bleed.
  ['public/apple-touch-icon.png', 180, SQUARE],
  ['extension/public/icon-16.png', 16, TILE_SMALL],
  ['extension/public/icon-32.png', 32, TILE],
  ['extension/public/icon-48.png', 48, TILE],
  ['extension/public/icon-128.png', 128, TILE],
];

writeFileSync(join(root, 'public/favicon.svg'), logoSvg(TILE));

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [file, size, variant] of PNGS) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<body style="margin:0">${logoSvg(variant, size)}</body>`);
    const out = join(root, file);
    mkdirSync(dirname(out), { recursive: true });
    await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    console.log(`wrote ${file}`);
  }
} finally {
  await browser.close();
}
