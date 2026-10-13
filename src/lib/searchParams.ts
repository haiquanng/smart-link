import { z } from 'zod';
import { sourceSchema, type Source } from '@/lib/ingestPayload';
import { MAX_TAG_FILTERS, type SearchRequestFilters } from '@/lib/searchBody';

export const TIME_RANGES = ['all', '7d', '30d', '1y'] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

export interface SearchFilters {
  sources: Source[];
  tags: string[];
  range: TimeRange;
  collectionId: string | null;
}

export interface SearchState {
  query: string;
  filters: SearchFilters;
}

export const EMPTY_FILTERS: SearchFilters = {
  sources: [],
  tags: [],
  range: 'all',
  collectionId: null,
};

const uuidSchema = z.string().uuid();

const DAY_MS = 24 * 60 * 60 * 1000;

/** Bad or duplicate values in a hand-edited URL are dropped, never thrown. */
export function parseSearchParams(params: URLSearchParams): SearchState {
  const sources: Source[] = [];
  for (const raw of (params.get('src') ?? '').split(',')) {
    const parsed = sourceSchema.safeParse(raw);
    if (parsed.success && !sources.includes(parsed.data)) sources.push(parsed.data);
  }
  const tags = [...new Set(params.getAll('tag').map((t) => t.trim()).filter(Boolean))].slice(
    0,
    MAX_TAG_FILTERS,
  );
  const rawRange = params.get('t');
  const range = TIME_RANGES.find((r) => r === rawRange) ?? 'all';
  const col = uuidSchema.safeParse(params.get('col'));
  const collectionId = col.success ? col.data : null;
  return { query: params.get('q') ?? '', filters: { sources, tags, range, collectionId } };
}

export function serializeSearchParams(query: string, filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (filters.sources.length > 0) params.set('src', filters.sources.join(','));
  for (const tag of filters.tags) params.append('tag', tag);
  if (filters.range !== 'all') params.set('t', filters.range);
  if (filters.collectionId) params.set('col', filters.collectionId);
  return params;
}

function fromDate(range: Exclude<TimeRange, 'all'>, now: Date): string {
  if (range === '1y') {
    const d = new Date(now);
    d.setUTCFullYear(d.getUTCFullYear() - 1);
    return d.toISOString();
  }
  const days = range === '7d' ? 7 : 30;
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}

/** Shape sent to the search function; omits everything that is not set. */
export function toRequestFilters(filters: SearchFilters, now: Date): SearchRequestFilters {
  const out: SearchRequestFilters = {};
  if (filters.sources.length > 0) out.sources = filters.sources;
  if (filters.tags.length > 0) out.tags = filters.tags;
  if (filters.range !== 'all') out.from = fromDate(filters.range, now);
  if (filters.collectionId) out.collection_id = filters.collectionId;
  return out;
}
