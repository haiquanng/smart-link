import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Item } from '@/types/item';

// Signed URLs live 1h; refetch well before they expire.
const STALE_MS = 50 * 60 * 1000;

/** Maps image_path to a signed URL, fetched in one batch for the given items. */
export function useSignedImageUrls(items: Item[]): Record<string, string> {
  const paths = [
    ...new Set(items.flatMap((i) => (i.image_path ? [i.image_path] : []))),
  ].sort();
  const { data } = useQuery({
    queryKey: ['signed-urls', paths],
    queryFn: () => api.getSignedImageUrls(paths),
    enabled: paths.length > 0,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
  return data ?? {};
}
