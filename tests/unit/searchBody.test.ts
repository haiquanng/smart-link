import { describe, expect, it } from 'vitest';
import { searchBodySchema } from '@/lib/searchBody';

const id = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';

describe('searchBodySchema', () => {
  it('accepts a query with all filters and trims it', () => {
    const r = searchBodySchema.parse({
      query: '  dinh gia ',
      filters: {
        sources: ['facebook'],
        tags: ['saas'],
        collection_id: id,
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
      },
    });
    expect(r.query).toBe('dinh gia');
  });

  it('accepts a query without filters', () => {
    expect(searchBodySchema.safeParse({ query: 'a' }).success).toBe(true);
  });

  it.each([
    ['empty query', { query: '   ' }],
    ['long query', { query: 'a'.repeat(201) }],
    ['unknown source', { query: 'a', filters: { sources: ['tiktok'] } }],
    ['too many tags', { query: 'a', filters: { tags: Array(11).fill('t') } }],
    ['bad uuid', { query: 'a', filters: { collection_id: 'x' } }],
    ['bad date', { query: 'a', filters: { from: 'yesterday' } }],
    ['no query', { filters: {} }],
  ])('rejects %s', (_name, body) => {
    expect(searchBodySchema.safeParse(body).success).toBe(false);
  });
});
