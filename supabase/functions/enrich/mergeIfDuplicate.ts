import { admin } from '../_shared/adminClient.ts';
import { dedupeAction } from '../_shared/dedupe.ts';

export interface MergeCandidate {
  id: string;
  user_id: string;
  note: string | null;
  image_path: string | null;
}

/**
 * Business rule 5: one row per normalized URL per user. If the resolved URL
 * already exists, fold this item into it per dedupeAction. Returns the id it
 * merged into, or null when the item stays (including the `separate` case,
 * where the caller must also leave url_normalized unset).
 */
export async function mergeIfDuplicate(
  item: MergeCandidate,
  resolved: string,
): Promise<{ mergedInto: string | null; separate: boolean }> {
  const { data: existing } = await admin
    .from('items')
    .select('id, note, image_path')
    .eq('user_id', item.user_id)
    .eq('url_normalized', resolved)
    .neq('id', item.id)
    .maybeSingle();
  if (!existing) return { mergedInto: null, separate: false };

  const action = dedupeAction(!!item.image_path, !!existing.image_path);
  if (action === 'separate') return { mergedInto: null, separate: true };

  const merged =
    item.note && existing.note
      ? `${existing.note}\n${item.note}`
      : (item.note ?? existing.note);
  const update: Record<string, unknown> = { note: merged };
  if (action === 'attach_image') {
    // The storage object moves with the image_path; it is not deleted here.
    update.image_path = item.image_path;
    // The new image has not been OCRed yet; hand the item back to enrichment.
    update.status = 'pending';
    update.enrich_attempts = 0;
  }
  await admin.from('items').update(update).eq('id', existing.id);
  await admin.from('items').delete().eq('id', item.id);
  return { mergedInto: existing.id as string, separate: false };
}
