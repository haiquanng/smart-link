import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SearchFilters } from '@/lib/searchParams';
import type { Item } from '@/types/item';

/** Hybrid search. Disabled until there is a query; keeps the previous results
 *  on screen while the next ones load so typing does not flash. */
export function useSearchItems(query: string, filters: SearchFilters) {
  const trimmed = query.trim();
  return useQuery<Item[]>({
    queryKey: ['search', trimmed, filters],
    queryFn: () => api.searchItems(trimmed, filters),
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
  });
}
