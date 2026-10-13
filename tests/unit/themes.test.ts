import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/lib/contrast';
import { THEMES, THEME_IDS, themeVariables } from '@/lib/themes';

describe('contrastRatio', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });
});

// Every text/background pair the components actually use (WCAG AA, 4.5:1).
const TEXT_PAIRS: [string, string][] = [
  ['ink', 'canvas'],
  ['ink', 'white'],
  ['stone-500', 'white'],
  ['stone-500', 'canvas'],
  ['stone-400', 'white'],
  ['stone-400', 'canvas'],
  ['stone-600', 'stone-50'],
  ['white', 'ink'],
  ['accent', 'white'],
  ['red-600', 'white'],
  ['emerald-700', 'white'],
  ['amber-600', 'white'],
];

describe.each(THEME_IDS)('theme %s', (id) => {
  const vars = themeVariables(THEMES[id]);
  const color = (name: string) => vars[`--color-${name}`];

  it.each(TEXT_PAIRS)('%s on %s meets AA', (fg, bg) => {
    expect(contrastRatio(color(fg), color(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps borders visible against the surface', () => {
    expect(contrastRatio(color('line'), color('white'))).toBeGreaterThan(1.15);
  });

  it('defines the whole neutral scale', () => {
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) {
      expect(color(`stone-${step}`)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
