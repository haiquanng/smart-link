import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { COLLECTIONS_KEY } from '@/hooks/useCollections';

export interface SharingInput {
  enabled: boolean;
  notes: boolean;
  images: boolean;
}

export function useCollectionSharing(collectionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SharingInput) => api.collections.setSharing(collectionId, input),
    onSettled: () => qc.invalidateQueries({ queryKey: COLLECTIONS_KEY }),
  });
}
