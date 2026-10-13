import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  parseSearchParams,
  serializeSearchParams,
  toRequestFilters,
} from '@/lib/searchParams';

const parse = (qs: string) => parseSearchParams(new URLSearchParams(qs));
const COL = '6cbcca19-eb9c-426d-9579-03a0f0930f23';

describe('searchParams', () => {
  it('parses query, sources, tags and range', () => {
    expect(parse('q=dinh+gia&src=facebook,instagram&tag=saas&tag=gia&t=30d')).toEqual({
      query: 'dinh gia',
      filters: {
        sources: ['facebook', 'instagram'],
        tags: ['saas', 'gia'],
        range: '30d',
        collectionId: null,
      },
    });
  });

  it('defaults to no filters', () => {
    expect(parse('')).toEqual({ query: '', filters: EMPTY_FILTERS });
  });

  it('ignores invalid values and duplicates', () => {
    const { filters } = parse('src=facebook,bogus,facebook&t=99d&tag=&tag=a&tag=a');
    expect(filters).toEqual({ sources: ['facebook'], tags: ['a'], range: 'all', collectionId: null });
  });

  it('caps tags at 10', () => {
    const qs = Array.from({ length: 12 }, (_, i) => `tag=t${i}`).join('&');
    expect(parse(qs).filters.tags).toHaveLength(10);
  });

  it('round-trips through serialize', () => {
    const state = {
      query: 'nấu ăn',
      filters: { sources: ['threads' as const, 'web' as const], tags: ['a b', 'c,d'], range: '7d' as const, collectionId: COL },
    };
    expect(parseSearchParams(serializeSearchParams(state.query, state.filters))).toEqual(state);
  });

  it('omits empty parts when serializing', () => {
    expect(serializeSearchParams('', EMPTY_FILTERS).toString()).toBe('');
    expect(serializeSearchParams('x', EMPTY_FILTERS).toString()).toBe('q=x');
  });

  it('turns a range into a from date for the request', () => {
    const now = new Date('2026-10-11T00:00:00.000Z');
    expect(toRequestFilters({ ...EMPTY_FILTERS, range: '7d' }, now)).toEqual({
      from: '2026-10-04T00:00:00.000Z',
    });
    expect(toRequestFilters(EMPTY_FILTERS, now)).toEqual({});
    expect(
      toRequestFilters({ sources: ['web'], tags: ['a'], range: '1y', collectionId: null }, now),
    ).toEqual({ sources: ['web'], tags: ['a'], from: '2025-10-11T00:00:00.000Z' });
  });

  it('reads a collection filter only when it is a uuid', () => {
    expect(parse(`col=${COL}`).filters.collectionId).toBe(COL);
    expect(parse('col=not-a-uuid').filters.collectionId).toBeNull();
  });

  it('sends the collection filter as collection_id', () => {
    const now = new Date('2026-10-11T00:00:00.000Z');
    expect(toRequestFilters({ ...EMPTY_FILTERS, collectionId: COL }, now)).toEqual({
      collection_id: COL,
    });
  });
});
