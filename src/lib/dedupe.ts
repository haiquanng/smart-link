export type DedupeAction = 'append_note' | 'attach_image' | 'separate';

/**
 * What to do when a save hits an existing item with the same normalized URL
 * (business rule 5). Authoritative copy; mirrored in
 * supabase/functions/_shared/dedupe.ts for Deno.
 */
export function dedupeAction(
  incomingHasImage: boolean,
  existingHasImage: boolean,
): DedupeAction {
  if (!incomingHasImage) return 'append_note';
  return existingHasImage ? 'separate' : 'attach_image';
}
