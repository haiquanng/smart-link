import { describe, expect, it } from 'vitest';
import { planItemEdit } from '@/lib/itemEdit';

const base = {
  url: 'https://example.com',
  image_path: null,
  note: 'old note',
  title: 'AI title',
  title_origin: 'ai' as const,
  summary: 'AI summary',
};

describe('planItemEdit', () => {
  it('returns nothing when nothing changed', () => {
    expect(planItemEdit(base, { note: 'old note', title: 'AI title', removeSummary: false })).toEqual({
      ok: true,
      patch: {},
    });
  });

  it('trims the note and stores an empty one as null', () => {
    expect(planItemEdit(base, { note: '  new  ', title: 'AI title', removeSummary: false })).toEqual({
      ok: true,
      patch: { note: 'new' },
    });
    expect(planItemEdit(base, { note: '   ', title: 'AI title', removeSummary: false })).toEqual({
      ok: true,
      patch: { note: null },
    });
  });

  it('marks an edited title as the user’s own, so enrich never replaces it', () => {
    expect(planItemEdit(base, { note: 'old note', title: 'Mine', removeSummary: false })).toEqual({
      ok: true,
      patch: { title: 'Mine', title_origin: 'user' },
    });
  });

  it('clearing the title clears its origin too', () => {
    expect(planItemEdit(base, { note: 'old note', title: '', removeSummary: false }).patch).toEqual({
      title: null,
      title_origin: null,
    });
  });

  it('removes the AI summary on request', () => {
    expect(planItemEdit(base, { note: 'old note', title: 'AI title', removeSummary: true }).patch).toEqual({
      summary: null,
    });
  });

  it('refuses to leave an item with no url, note or image (rule 2)', () => {
    const noteOnly = { ...base, url: null };
    expect(planItemEdit(noteOnly, { note: '', title: 'AI title', removeSummary: false })).toEqual({
      ok: false,
      patch: {},
    });
  });
});
