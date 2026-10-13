import { describe, expect, it } from 'vitest';
import { localDateString } from '@/lib/localDate';

describe('localDateString', () => {
  it('formats the local calendar date, not the UTC one', () => {
    // 23:30 local on Oct 13 is still Oct 13 locally, whatever UTC says.
    expect(localDateString(new Date(2026, 9, 13, 23, 30))).toBe('2026-10-13');
    expect(localDateString(new Date(2026, 0, 2, 0, 5))).toBe('2026-01-02');
  });
});
