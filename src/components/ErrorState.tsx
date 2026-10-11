import { vi } from '@/i18n/vi';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <p className="text-sm text-slate-400">{message ?? vi.common.error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="min-h-[44px] rounded-lg bg-slate-800 px-5 text-sm font-medium text-slate-100 active:bg-slate-700"
        >
          {vi.common.retry}
        </button>
      )}
    </div>
  );
}
