import type { Item } from '@/types/item';

// After this, a still-pending item most likely lost its enrich trigger; stop
// polling and stop showing "processing" so the UI doesn't look stuck.
export const ENRICH_WINDOW_MS = 3 * 60 * 1000;

export function isEnriching(item: Item, now: number): boolean {
  return (
    item.status === 'pending' &&
    now - new Date(item.created_at).getTime() < ENRICH_WINDOW_MS
  );
}
