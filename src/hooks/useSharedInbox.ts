import { useQuery } from '@tanstack/react-query';
import { readSharedInbox, type SharedInbox } from '@/lib/shareInbox';

/**
 * The incoming share: from the service worker's cache (POST share target), or
 * from query params when the worker was not installed yet (GET fallback).
 */
export function useSharedInbox(params: URLSearchParams) {
  const incoming = params.get('incoming') === '1';
  return useQuery<SharedInbox | null>({
    queryKey: ['shared-inbox', params.toString()],
    queryFn: async () => {
      if (incoming) return readSharedInbox();
      const payload = {
        title: params.get('title') ?? '',
        text: params.get('text') ?? '',
        url: params.get('url') ?? '',
      };
      return payload.title || payload.text || payload.url ? { payload, files: [] } : null;
    },
    staleTime: Infinity,
    retry: false,
  });
}
