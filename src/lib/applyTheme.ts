import { THEME_IDS, THEMES, themeVariables, type ThemeId } from '@/lib/themes';

const STORAGE_KEY = 'smart-link-theme';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

/** Re-skins the app by overriding the theme CSS variables on <html>. */
export function applyTheme(id: ThemeId): void {
  const theme = THEMES[id];
  const root = document.documentElement;
  for (const [name, value] of Object.entries(themeVariables(theme))) root.style.setProperty(name, value);
  root.dataset.theme = id;
  root.style.colorScheme = theme.dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.canvas);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode or blocked storage: the profile still holds the choice.
  }
}

/** Last theme on this device, applied before the first paint to avoid a flash. */
export function cachedTheme(): ThemeId {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isThemeId(value) ? value : 'default';
  } catch {
    return 'default';
  }
}
