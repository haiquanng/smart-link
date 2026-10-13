import { describe, expect, it } from 'vitest';
import { isSaved, savedKeys } from './savedIndex';

describe('saved index (already-saved badge)', () => {
  const keys = new Set(
    savedKeys([
      { url: 'https://www.facebook.com/share/1KWvE4QeZK/?mibextid=wwXlfr', url_normalized: 'https://www.facebook.com/groups/1/posts/2' },
      { url: 'https://Example.com/a/?utm_source=x', url_normalized: 'https://example.com/a' },
      { url: null, url_normalized: null },
    ]),
  );

  it('matches the same page despite tracking params, case and trailing slash', () => {
    expect(isSaved('https://example.com/a/?utm_medium=y#top', keys)).toBe(true);
    expect(isSaved('https://EXAMPLE.com/a', keys)).toBe(true);
  });

  it('matches both the shared /share/ link and the post it resolved to', () => {
    expect(isSaved('https://www.facebook.com/share/1KWvE4QeZK/', keys)).toBe(true);
    expect(isSaved('https://www.facebook.com/groups/1/posts/2?fbclid=abc', keys)).toBe(true);
  });

  it('does not match other pages or non-http tabs', () => {
    expect(isSaved('https://example.com/b', keys)).toBe(false);
    expect(isSaved('chrome://newtab', keys)).toBe(false);
    expect(isSaved('', keys)).toBe(false);
  });

  it('skips rows without a url (screenshot-only items)', () => {
    expect([...keys].every((k) => k.startsWith('https://'))).toBe(true);
  });
});
