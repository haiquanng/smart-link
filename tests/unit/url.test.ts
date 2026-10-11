import { describe, expect, it, vi } from 'vitest';
import {
  detectSource,
  needsRedirectResolution,
  normalizeUrl,
  normalizeUrlSync,
  stripTrackingParams,
} from '@/lib/url';

describe('stripTrackingParams / normalizeUrlSync', () => {
  it('lowercases the host but keeps the path case', () => {
    expect(normalizeUrlSync('https://WWW.Instagram.com/reel/C9xYz1AbCdE/')).toBe(
      'https://www.instagram.com/reel/C9xYz1AbCdE',
    );
  });

  it('strips mibextid, fbclid, igshid and all utm_* params', () => {
    const got = normalizeUrlSync(
      'https://www.instagram.com/reel/C9xYz1AbCdE/?igshid=ABC&utm_source=ig_web&utm_medium=x&mibextid=y&fbclid=z',
    );
    expect(got).toBe('https://www.instagram.com/reel/C9xYz1AbCdE');
  });

  it('keeps meaningful query params', () => {
    expect(
      normalizeUrlSync('https://example.com/watch?v=abc123&utm_source=x'),
    ).toBe('https://example.com/watch?v=abc123');
  });

  it('drops the fragment', () => {
    expect(stripTrackingParams('https://example.com/a#section')).toBe(
      'https://example.com/a',
    );
  });

  it('strips Facebook share-redirect params rdid and share_url', () => {
    expect(
      normalizeUrlSync(
        'https://www.facebook.com/groups/vnjug/permalink/2554755371616434/?rdid=xBOKtn5AoDAtLzHj&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fp%2F19JUhwkxHM%2F',
      ),
    ).toBe('https://www.facebook.com/groups/vnjug/permalink/2554755371616434');
  });

  it('two links differing only by tracking params normalize equal (dedupe)', () => {
    const a = normalizeUrlSync('https://sub.substack.com/p/x?utm_source=email');
    const b = normalizeUrlSync('https://sub.substack.com/p/x?utm_medium=web');
    expect(a).toBe(b);
  });
});

describe('needsRedirectResolution', () => {
  it('flags facebook /share/ links', () => {
    expect(
      needsRedirectResolution('https://www.facebook.com/share/1KWvE4QeZK/'),
    ).toBe(true);
  });
  it('does not flag a normal facebook post', () => {
    expect(
      needsRedirectResolution('https://www.facebook.com/user/posts/123'),
    ).toBe(false);
  });
});

describe('normalizeUrl (async, with redirect resolution)', () => {
  it('resolves a facebook /share/ link via the injected resolver then normalizes', async () => {
    const resolveRedirect = vi
      .fn()
      .mockResolvedValue(
        'https://www.facebook.com/realuser/posts/999?fbclid=abc',
      );
    const got = await normalizeUrl(
      'https://www.facebook.com/share/1KWvE4QeZK/?mibextid=wwXlfr',
      { resolveRedirect },
    );
    expect(resolveRedirect).toHaveBeenCalledOnce();
    expect(got).toBe('https://www.facebook.com/realuser/posts/999');
  });

  it('falls back to the original url when the resolver fails', async () => {
    const resolveRedirect = vi.fn().mockRejectedValue(new Error('network'));
    const got = await normalizeUrl(
      'https://www.facebook.com/share/1KWvE4QeZK/',
      { resolveRedirect },
    );
    expect(got).toBe('https://www.facebook.com/share/1KWvE4QeZK');
  });

  it('does not call the resolver for non-share links', async () => {
    const resolveRedirect = vi.fn();
    await normalizeUrl('https://substack.com/p/x', { resolveRedirect });
    expect(resolveRedirect).not.toHaveBeenCalled();
  });
});

describe('detectSource', () => {
  it.each([
    ['https://www.facebook.com/share/x', 'facebook'],
    ['https://instagram.com/reel/x', 'instagram'],
    ['https://www.threads.net/@u/post/x', 'threads'],
    ['https://sub.substack.com/p/x', 'substack'],
    ['https://example.com/a', 'web'],
  ])('%s -> %s', (url, expected) => {
    expect(detectSource(url)).toBe(expected);
  });

  it('returns other for an unparseable url', () => {
    expect(detectSource('not a url')).toBe('other');
  });
});
