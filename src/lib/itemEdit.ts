import type { Item } from '@/types/item';

export type EditableItem = Pick<Item, 'url' | 'image_path' | 'note' | 'title' | 'title_origin' | 'summary'>;

export interface ItemDraft {
  note: string;
  title: string;
  removeSummary: boolean;
}

export interface ItemPatch {
  note?: string | null;
  title?: string | null;
  title_origin?: 'user' | null;
  summary?: null;
}

const clean = (s: string): string | null => s.trim() || null;

/**
 * Turns the edit form into an update. A title the user typed is marked
 * `user` so enrich never overwrites it (rule 9); rejecting an edit that
 * would leave nothing to find the item by (rule 2).
 */
export function planItemEdit(item: EditableItem, draft: ItemDraft): { ok: boolean; patch: ItemPatch } {
  const patch: ItemPatch = {};
  const note = clean(draft.note);
  const title = clean(draft.title);

  if (note !== item.note) patch.note = note;
  if (title !== item.title) {
    patch.title = title;
    patch.title_origin = title ? 'user' : null;
  }
  if (draft.removeSummary && item.summary !== null) patch.summary = null;

  if (!item.url && !item.image_path && !note) return { ok: false, patch: {} };
  return { ok: true, patch };
}
