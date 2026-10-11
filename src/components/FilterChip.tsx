import type { ReactNode } from 'react';

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** Toggle chip for the search filter row; 44px tall for touch. */
export function FilterChip({ active, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-[44px] shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors ${
        active
          ? 'border-ink bg-ink text-white'
          : 'border-line bg-white text-ink hover:bg-stone-50'
      }`}
    >
      {children}
    </button>
  );
}
