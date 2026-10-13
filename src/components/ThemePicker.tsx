import { Check } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { THEME_IDS, THEMES } from '@/lib/themes';
import { vi } from '@/i18n/vi';

/** Flat color swatches; the choice is saved to the profile (all devices). */
export function ThemePicker() {
  const { theme, setTheme } = useTheme(true);

  return (
    <div role="radiogroup" aria-label={vi.settings.themeTitle} className="flex flex-wrap justify-between gap-y-3">
      {THEME_IDS.map((id) => {
        const t = THEMES[id];
        const selected = theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={vi.settings.themes[id]}
            onClick={() => setTheme.mutate(id)}
            className="flex w-14 flex-col items-center gap-1.5 text-center text-[11px] leading-tight text-stone-500"
          >
            <span
              className={`relative flex h-12 w-12 items-end justify-end overflow-hidden rounded-xl border ${
                selected ? 'border-ink ring-2 ring-ink ring-offset-2 ring-offset-white' : 'border-line'
              }`}
              style={{ backgroundColor: t.canvas }}
            >
              <span className="absolute left-2 top-2 h-3 w-6 rounded" style={{ backgroundColor: t.ink }} />
              <span className="m-2 h-4 w-4 rounded-full" style={{ backgroundColor: t.accent }} />
              {selected && (
                <Check size={14} aria-hidden="true" className="absolute bottom-1 left-1.5" style={{ color: t.ink }} />
              )}
            </span>
            {vi.settings.themes[id]}
          </button>
        );
      })}
      {setTheme.isError && <p className="w-full text-xs text-red-600">{vi.common.error}</p>}
    </div>
  );
}
