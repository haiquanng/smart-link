import { vi } from '@/i18n/vi';

export function Spinner() {
  return (
    <div
      className="flex items-center justify-center py-16"
      role="status"
      aria-live="polite"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-ink" />
      <span className="sr-only">{vi.common.loading}</span>
    </div>
  );
}
