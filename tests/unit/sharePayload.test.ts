import { describe, expect, it } from 'vitest';
import { parseSharePayload } from '@/lib/sharePayload';
import cases from '../fixtures/shareTargets.json';

describe('parseSharePayload (Android Web Share Target)', () => {
  for (const c of cases) {
    it(c.name, () => {
      expect(parseSharePayload(c.payload)).toEqual(c.expected);
    });
  }

  it('handles missing fields', () => {
    expect(parseSharePayload({})).toEqual({ url: '', context: '' });
  });
});
