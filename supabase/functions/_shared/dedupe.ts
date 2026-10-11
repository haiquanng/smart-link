// Deno mirror of src/lib/dedupe.ts (authoritative, unit-tested there).

export type DedupeAction = 'append_note' | 'attach_image' | 'separate';

export function dedupeAction(
  incomingHasImage: boolean,
  existingHasImage: boolean,
): DedupeAction {
  if (!incomingHasImage) return 'append_note';
  return existingHasImage ? 'separate' : 'attach_image';
}
