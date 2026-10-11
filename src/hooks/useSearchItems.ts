import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Item } from '@/types/item';

/** Searches via the search_items RPC. Disabled until there is a query. */
export function useSearchItems(query: string) {
  const trimmed = query.trim();
  return useQuery<Item[]>({
    queryKey: ['search', trimmed],
    queryFn: () => api.searchItems(trimmed),
    enabled: trimmed.length > 0,
  });
}
