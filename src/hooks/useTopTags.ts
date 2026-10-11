import { useQuery } from '@tanstack/react-query';
import { api, type TagCount } from '@/lib/api';

const STALE_MS = 5 * 60 * 1000;

/** Filter chips are optional UI: a failure just means no tag chips. */
export function useTopTags(): TagCount[] {
  const { data } = useQuery({
    queryKey: ['top-tags'],
    queryFn: () => api.listTopTags(),
    staleTime: STALE_MS,
  });
  return data ?? [];
}
