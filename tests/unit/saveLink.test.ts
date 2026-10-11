import { describe, expect, it } from 'vitest';
import { optimisticItem } from '@/hooks/useSaveLink';
import { pollInterval } from '@/hooks/useItems';
import type { Item } from '@/types/item';

const now = new Date('2026-10-11T12:00:00Z');

describe('optimisticItem', () => {
  it('shows the pasted link as pending with its source', () => {
    const item = optimisticItem(
      { url: ' https://www.facebook.com/share/p/19JUhwkxHM/ ', note: ' Queue worker ' },
      now,
    );
    expect(item).toMatchObject({
      url: 'https://www.facebook.com/share/p/19JUhwkxHM/',
      note: 'Queue worker',
      source: 'facebook',
      status: 'pending',
      created_at: now.toISOString(),
    });
  });

  it('handles a note-only save', () => {
    const item = optimisticItem({ url: '', note: 'chỉ ghi chú' }, now);
    expect(item.url).toBeNull();
    expect(item.source).toBe('other');
  });
});

describe('pollInterval', () => {
  const at = (status: Item['status'], secondsAgo: number): Item => ({
    ...optimisticItem({ url: 'https://example.com', note: '' }, now),
    status,
    created_at: new Date(now.getTime() - secondsAgo * 1000).toISOString(),
  });

  it('polls while a recent item is pending', () => {
    expect(pollInterval([at('pending', 5)], now.getTime())).toBe(3000);
  });

  it('stops when everything is enriched or failed', () => {
    expect(
      pollInterval([at('ready', 5), at('enrich_failed', 5)], now.getTime()),
    ).toBe(false);
  });

  it('gives up on an item stuck pending for minutes', () => {
    expect(pollInterval([at('pending', 600)], now.getTime())).toBe(false);
  });

  it('does not poll with no data', () => {
    expect(pollInterval(undefined, now.getTime())).toBe(false);
  });
});
