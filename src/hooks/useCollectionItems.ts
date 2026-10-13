import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Item } from '@/types/item';

export const collectionItemsKey = (id: string) => ['collection-items', id];

export function useCollectionItems(collectionId: string) {
  return useQuery<Item[]>({
    queryKey: collectionItemsKey(collectionId),
    queryFn: () => api.collections.listItems(collectionId),
  });
}
