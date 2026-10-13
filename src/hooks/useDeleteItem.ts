import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Item } from '@/types/item';

const ITEMS_KEY = ['items'];

/** Removes the item from the list at once; restores it if the delete fails. */
export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: Pick<Item, 'id' | 'image_path'>) => api.deleteItem(item),
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: ITEMS_KEY });
      const previous = qc.getQueryData<Item[]>(ITEMS_KEY);
      qc.setQueryData<Item[]>(ITEMS_KEY, (old) =>
        old?.filter((i) => i.id !== item.id),
      );
      return { previous };
    },
    onError: (_err, _item, context) => {
      qc.setQueryData(ITEMS_KEY, context?.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ITEMS_KEY });
      qc.invalidateQueries({ queryKey: ['search'] });
      qc.invalidateQueries({ queryKey: ['collection-items'] });
      qc.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}
