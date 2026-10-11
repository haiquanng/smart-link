import { vi } from '@/i18n/vi';

export function Spinner() {
  return (
    <div
      className="flex items-center justify-center py-16 text-slate-400"
      role="status"
      aria-live="polite"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
      <span className="sr-only">{vi.common.loading}</span>
    </div>
  );
}
