import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isEnriching } from '@/lib/itemStatus';
import type { Item } from '@/types/item';

const POLL_MS = 3000;

/** Poll while a recent item is still being enriched, so titles appear live. */
export function pollInterval(items: Item[] | undefined, now: number): number | false {
  return items?.some((i) => isEnriching(i, now)) ? POLL_MS : false;
}

export function useItems() {
  return useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () => api.listItems(),
    refetchInterval: (query) => pollInterval(query.state.data, Date.now()),
  });
}
