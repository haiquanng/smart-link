import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Item } from '@/types/item';

export function useItems() {
  return useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: () => api.listItems(),
  });
}
