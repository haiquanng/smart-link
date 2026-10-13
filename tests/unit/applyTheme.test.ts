import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, cachedTheme } from '@/lib/applyTheme';
import { THEMES } from '@/lib/themes';

describe('applyTheme', () => {
  afterEach(() => localStorage.clear());

  it('sets the theme variables, color scheme, and remembers the choice', () => {
    applyTheme('dark');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-canvas')).toBe(THEMES.dark.canvas);
    expect(root.style.getPropertyValue('--color-white')).toBe(THEMES.dark.surface);
    expect(root.dataset.theme).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(cachedTheme()).toBe('dark');
  });

  it('falls back to the default for an unknown cached value', () => {
    localStorage.setItem('smart-link-theme', 'neon');
    expect(cachedTheme()).toBe('default');
  });
});
