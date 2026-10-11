import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { detectSource } from '@/lib/url';
import type { Item } from '@/types/item';

interface SaveInput {
  url: string;
  note: string;
}

const ITEMS_KEY = ['items'];

/** Builds the placeholder row shown in Inbox before the server answers. */
export function optimisticItem({ url, note }: SaveInput, now: Date): Item {
  const cleanUrl = url.trim() || null;
  return {
    id: `optimistic-${now.getTime()}`,
    url: cleanUrl,
    url_normalized: null,
    source: cleanUrl ? detectSource(cleanUrl) : 'other',
    channel: 'manual',
    note: note.trim() || null,
    title: null,
    summary: null,
    title_origin: null,
    enrich_attempts: 0,
    content_text: null,
    image_path: null,
    preview_image_url: null,
    status: 'pending',
    seen_at: null,
    created_at: now.toISOString(),
  };
}

/** Saves a link and shows it in Inbox immediately; rolls back on failure. */
export function useSaveLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ url, note }: SaveInput) => api.saveLink(url, note),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ITEMS_KEY });
      const previous = qc.getQueryData<Item[]>(ITEMS_KEY);
      qc.setQueryData<Item[]>(ITEMS_KEY, (old) => [
        optimisticItem(input, new Date()),
        ...(old ?? []),
      ]);
      return { previous };
    },
    onError: (_err, _input, context) => {
      qc.setQueryData(ITEMS_KEY, context?.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ITEMS_KEY }),
  });
}
