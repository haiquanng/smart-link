import { vi } from '@/i18n/vi';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="text-sm text-stone-500">{message ?? vi.common.error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="min-h-[44px] rounded-lg border border-line bg-white px-5 text-sm font-medium text-ink hover:bg-stone-50"
        >
          {vi.common.retry}
        </button>
      )}
    </div>
  );
}
