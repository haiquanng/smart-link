import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Manual enrich retry; the item stays searchable by its note meanwhile. */
export function useRetryEnrich(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.itemEdit.retryEnrich(itemId),
    onSettled: () => {
      for (const key of ['items', 'search', 'collection-items', 'resurface']) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
