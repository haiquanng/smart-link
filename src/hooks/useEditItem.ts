import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ItemPatch } from '@/lib/itemEdit';

/** Saves an edit, refreshes every list showing the item, then re-embeds. */
export function useEditItem(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ItemPatch) => api.itemEdit.update(itemId, patch),
    onSuccess: () => {
      // Full text updates with the row; the embedding catches up in the
      // background and a failure there only delays semantic search.
      void api.itemEdit.refreshEmbedding(itemId).catch(() => undefined);
    },
    onSettled: () => {
      for (const key of ['items', 'search', 'collection-items', 'resurface']) {
        void qc.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
