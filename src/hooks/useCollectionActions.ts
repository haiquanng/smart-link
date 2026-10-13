import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { COLLECTIONS_KEY } from '@/hooks/useCollections';

/** Create, rename and delete; each refreshes the collection list. */
export function useCollectionActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: COLLECTIONS_KEY });

  const create = useMutation({
    mutationFn: (name: string) => api.collections.create(name),
    onSettled: refresh,
  });
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.collections.rename(id, name),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.collections.remove(id),
    onSettled: () => {
      void refresh();
      void qc.invalidateQueries({ queryKey: ['item-collections'] });
    },
  });

  return { create, rename, remove };
}
