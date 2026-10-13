import { mix } from '@/lib/contrast';

export const THEME_IDS = ['default', 'peach', 'mint', 'lavender', 'dark'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** A theme is a few flat base colors; the neutral scale is mixed from them. */
export interface Theme {
  canvas: string;
  /** Cards, inputs, sheets (what `bg-white` paints). */
  surface: string;
  ink: string;
  line: string;
  accent: string;
  accentSoft: string;
  danger: string;
  success: string;
  warning: string;
  dark: boolean;
}

export const THEMES: Record<ThemeId, Theme> = {
  default: {
    canvas: '#fafaf9', surface: '#ffffff', ink: '#1c1917', line: '#e7e5e4',
    accent: '#c2410c', accentSoft: '#fdeee9',
    danger: '#dc2626', success: '#047857', warning: '#b45309', dark: false,
  },
  peach: {
    canvas: '#fff7f3', surface: '#ffffff', ink: '#2b1d1a', line: '#f1e0d8',
    accent: '#be2f55', accentSoft: '#fde7ee',
    danger: '#c81e1e', success: '#047857', warning: '#b45309', dark: false,
  },
  mint: {
    canvas: '#f3faf6', surface: '#ffffff', ink: '#12261e', line: '#d9ebe2',
    accent: '#0f766e', accentSoft: '#dcf2ec',
    danger: '#c81e1e', success: '#047857', warning: '#a14b06', dark: false,
  },
  lavender: {
    canvas: '#f7f6fd', surface: '#ffffff', ink: '#1d1a33', line: '#e3e0f3',
    accent: '#6440d0', accentSoft: '#ece8fd',
    danger: '#c81e1e', success: '#047857', warning: '#b45309', dark: false,
  },
  dark: {
    canvas: '#141211', surface: '#1f1c1a', ink: '#f5f5f4', line: '#3a3532',
    accent: '#fb8a63', accentSoft: '#3a2620',
    danger: '#f87171', success: '#34d399', warning: '#fbbf24', dark: true,
  },
};

// How far each neutral step sits from the surface toward ink. 400 and above
// are used for text, so they stay at AA contrast on both canvas and surface.
const NEUTRAL_STEPS: [number, number][] = [
  [50, 0.035], [100, 0.07], [200, 0.13], [300, 0.24], [400, 0.64],
  [500, 0.72], [600, 0.8], [700, 0.84], [800, 0.9], [900, 0.95],
];

/** CSS variables that re-skin the Tailwind utilities the components use. */
export function themeVariables(t: Theme): Record<string, string> {
  const vars: Record<string, string> = {
    '--color-canvas': t.canvas,
    '--color-white': t.surface,
    '--color-ink': t.ink,
    '--color-line': t.line,
    '--color-accent': t.accent,
    '--color-accent-soft': t.accentSoft,
    '--color-red-600': t.danger,
    '--color-red-700': t.danger,
    '--color-red-50': mix(t.surface, t.danger, 0.08),
    '--color-emerald-700': t.success,
    '--color-amber-600': t.warning,
    '--color-amber-700': t.warning,
    '--color-amber-50': mix(t.surface, t.warning, 0.1),
    '--color-amber-300': mix(t.surface, t.warning, 0.45),
  };
  for (const [step, amount] of NEUTRAL_STEPS) {
    vars[`--color-stone-${step}`] = mix(t.surface, t.ink, amount);
  }
  return vars;
}
