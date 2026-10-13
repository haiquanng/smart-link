import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { localDateString } from '@/lib/localDate';
import type { Item } from '@/types/item';

const key = (date: string) => ['resurface', date];

/** Today's picks plus a seen action that removes a card at once. */
export function useResurface() {
  const qc = useQueryClient();
  const today = localDateString(new Date());

  const query = useQuery<Item[]>({
    queryKey: key(today),
    queryFn: () => api.resurface.today(today),
  });

  const markSeen = useMutation({
    mutationFn: (itemId: string) => api.resurface.markSeen(itemId),
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: key(today) });
      const previous = qc.getQueryData<Item[]>(key(today));
      qc.setQueryData<Item[]>(key(today), (old) => old?.filter((i) => i.id !== itemId));
      return { previous };
    },
    onError: (_err, _id, context) => qc.setQueryData(key(today), context?.previous),
  });

  return { ...query, markSeen };
}

export function useResetResurface() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.resurface.reset(),
    onSettled: () => qc.invalidateQueries({ queryKey: ['resurface'] }),
  });
}
