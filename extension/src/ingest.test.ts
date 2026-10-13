import { describe, expect, it } from 'vitest';
import { ingestBody, ingestOutcome } from './ingest';

describe('extension ingest', () => {
  it('sends the tab url and trimmed note on the extension channel', () => {
    expect(ingestBody('https://example.com/a', '  ghi chú ')).toEqual({
      url: 'https://example.com/a',
      note: 'ghi chú',
      channel: 'extension',
    });
    expect(ingestBody('https://example.com/a', '  ')).toEqual({ url: 'https://example.com/a', channel: 'extension' });
  });

  it('maps ingest answers to what the popup says', () => {
    expect(ingestOutcome(201, { duplicate: false })).toBe('saved');
    expect(ingestOutcome(200, { duplicate: true })).toBe('duplicate');
    expect(ingestOutcome(401, {})).toBe('bad-token');
    expect(ingestOutcome(429, {})).toBe('rate-limited');
    expect(ingestOutcome(400, {})).toBe('error');
    expect(ingestOutcome(500, null)).toBe('error');
  });

  it('refuses pages that are not http(s), like chrome:// tabs', () => {
    expect(() => ingestBody('chrome://extensions', '')).toThrow();
  });
});
