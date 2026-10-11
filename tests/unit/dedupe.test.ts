import { describe, expect, it } from 'vitest';
import { dedupeAction } from '@/lib/dedupe';

describe('dedupeAction (business rule 5)', () => {
  it('appends the note when the incoming save has no image', () => {
    expect(dedupeAction(false, false)).toBe('append_note');
    expect(dedupeAction(false, true)).toBe('append_note');
  });

  it('attaches the image when the existing item has none', () => {
    expect(dedupeAction(true, false)).toBe('attach_image');
  });

  it('keeps a separate item when both have images', () => {
    expect(dedupeAction(true, true)).toBe('separate');
  });
});
