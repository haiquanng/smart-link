import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Collection } from '@/lib/collectionsApi';

export const COLLECTIONS_KEY = ['collections'];

export function useCollections() {
  return useQuery<Collection[]>({
    queryKey: COLLECTIONS_KEY,
    queryFn: () => api.collections.list(),
  });
}
