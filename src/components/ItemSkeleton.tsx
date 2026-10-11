import { vi } from '@/i18n/vi';

/** Card-shaped placeholders so the list doesn't jump when data arrives. */
export function ItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-line bg-white p-4"
        >
          <div className="h-4 w-2/3 rounded bg-stone-100" />
          <div className="mt-3 h-3 w-1/3 rounded bg-stone-100" />
        </div>
      ))}
      <span className="sr-only">{vi.common.loading}</span>
    </div>
  );
}
