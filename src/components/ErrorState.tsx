import { vi } from '@/i18n/vi';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="text-sm text-slate-500">{message ?? vi.common.error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="min-h-[44px] rounded-xl bg-slate-100 px-5 text-sm font-medium text-slate-700 active:bg-slate-200"
        >
          {vi.common.retry}
        </button>
      )}
    </div>
  );
}
