import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { COLLECTIONS_KEY } from '@/hooks/useCollections';
import { collectionItemsKey } from '@/hooks/useCollectionItems';

/** Which collections an item is in, and a toggle that updates at once. */
export function useItemCollections(itemId: string, enabled: boolean) {
  const qc = useQueryClient();
  const key = ['item-collections', itemId];

  const query = useQuery<string[]>({
    queryKey: key,
    queryFn: () => api.collections.forItem(itemId),
    enabled,
  });

  const toggle = useMutation({
    mutationFn: ({ collectionId, member }: { collectionId: string; member: boolean }) =>
      member
        ? api.collections.removeItem(collectionId, itemId)
        : api.collections.addItem(collectionId, itemId),
    onMutate: async ({ collectionId, member }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<string[]>(key);
      qc.setQueryData<string[]>(key, (old = []) =>
        member ? old.filter((id) => id !== collectionId) : [...old, collectionId],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => qc.setQueryData(key, context?.previous),
    onSettled: (_data, _err, { collectionId }) => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: COLLECTIONS_KEY });
      void qc.invalidateQueries({ queryKey: collectionItemsKey(collectionId) });
    },
  });

  return { ids: query.data ?? [], isLoading: query.isLoading, isError: query.isError, toggle };
}
