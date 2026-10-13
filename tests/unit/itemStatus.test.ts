import { describe, expect, it } from 'vitest';
import { ENRICH_WINDOW_MS, isEnriching, needsRetry } from '@/lib/itemStatus';
import type { Item } from '@/types/item';

const NOW = Date.parse('2026-10-13T12:00:00Z');
const at = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const item = (status: Item['status'], created_at: string) => ({ status, created_at }) as Item;

describe('item status', () => {
  it('a fresh pending item is enriching, not failed', () => {
    const i = item('pending', at(10_000));
    expect(isEnriching(i, NOW)).toBe(true);
    expect(needsRetry(i, NOW)).toBe(false);
  });

  it('a pending item past the window is offered a retry', () => {
    const i = item('pending', at(ENRICH_WINDOW_MS + 1));
    expect(isEnriching(i, NOW)).toBe(false);
    expect(needsRetry(i, NOW)).toBe(true);
  });

  it('a failed item is offered a retry whatever its age', () => {
    expect(needsRetry(item('enrich_failed', at(1000)), NOW)).toBe(true);
  });

  it('a ready item needs nothing', () => {
    expect(needsRetry(item('ready', at(ENRICH_WINDOW_MS * 10)), NOW)).toBe(false);
  });
});
