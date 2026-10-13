import { RefreshCw } from 'lucide-react';
import { useRetryEnrich } from '@/hooks/useRetryEnrich';
import { vi } from '@/i18n/vi';

/** Shown on cards whose enrichment failed or got stuck (business rule 7). */
export function RetryEnrichButton({ itemId }: { itemId: string }) {
  const retry = useRetryEnrich(itemId);

  return (
    <button
      type="button"
      aria-label={retry.isError ? vi.inbox.retryFailed : vi.inbox.retryEnrich}
      title={retry.isError ? vi.inbox.retryFailed : vi.inbox.retryEnrich}
      disabled={retry.isPending}
      onClick={() => retry.mutate()}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-amber-50 ${
        retry.isError ? 'text-red-600' : 'text-amber-600'
      }`}
    >
      <RefreshCw size={18} aria-hidden="true" className={retry.isPending ? 'animate-spin' : undefined} />
    </button>
  );
}
