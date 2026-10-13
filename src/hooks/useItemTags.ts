import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ItemTag } from '@/lib/itemEditApi';

/** An item's tags with add/remove; changes save at once. */
export function useItemTags(itemId: string, enabled: boolean) {
  const qc = useQueryClient();
  const key = ['item-tags', itemId];
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: key });
    void qc.invalidateQueries({ queryKey: ['top-tags'] });
  };

  const query = useQuery<ItemTag[]>({
    queryKey: key,
    queryFn: () => api.itemEdit.listTags(itemId),
    enabled,
  });
  const add = useMutation({
    mutationFn: (name: string) => api.itemEdit.addTag(itemId, name),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (tagId: string) => api.itemEdit.removeTag(itemId, tagId),
    onMutate: async (tagId) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ItemTag[]>(key);
      qc.setQueryData<ItemTag[]>(key, (old) => old?.filter((t) => t.id !== tagId));
      return { previous };
    },
    onError: (_err, _id, context) => qc.setQueryData(key, context?.previous),
    onSettled: refresh,
  });

  return { ...query, add, remove };
}
