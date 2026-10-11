import type { Item } from '@/types/item';

/** Tap target of a card: the saved URL, else the signed screenshot, else none. */
export function cardHref(item: Pick<Item, 'url'>, imageUrl?: string): string | null {
  return item.url ?? imageUrl ?? null;
}
