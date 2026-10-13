import { describe, expect, it } from 'vitest';
import { captureByDefault, ingestBody, ingestOutcome, screenshotPath } from './ingest';

describe('extension ingest', () => {
  it('sends the tab url and trimmed note on the extension channel', () => {
    expect(ingestBody('https://example.com/a', '  ghi chú ')).toEqual({
      url: 'https://example.com/a',
      note: 'ghi chú',
      channel: 'extension',
    });
    expect(ingestBody('https://example.com/a', '  ')).toEqual({ url: 'https://example.com/a', channel: 'extension' });
  });

  it('adds the uploaded screenshot path when there is one', () => {
    expect(ingestBody('https://example.com/a', '', 'u/s.jpg')).toEqual({
      url: 'https://example.com/a',
      channel: 'extension',
      image_path: 'u/s.jpg',
    });
  });

  it('maps ingest answers to what the popup says', () => {
    expect(ingestOutcome(201, { duplicate: false })).toBe('saved');
    expect(ingestOutcome(200, { duplicate: true })).toBe('duplicate');
    expect(ingestOutcome(401, {})).toBe('signed-out');
    expect(ingestOutcome(429, {})).toBe('rate-limited');
    expect(ingestOutcome(400, {})).toBe('error');
    expect(ingestOutcome(500, null)).toBe('error');
  });

  it('refuses pages that are not http(s), like chrome:// tabs', () => {
    expect(() => ingestBody('chrome://extensions', '')).toThrow();
  });

  it('puts screenshots in the user folder with the path ingest accepts', () => {
    const user = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';
    const id = '7d38b26a-6eac-48be-83dd-279c3115315f';
    expect(screenshotPath(user, id)).toBe(`${user}/${id}.jpg`);
    expect(screenshotPath(user, id)).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);
  });

  it('captures by default only where pages block reading (Facebook, Instagram, Threads)', () => {
    expect(captureByDefault('https://www.facebook.com/groups/1/posts/2')).toBe(true);
    expect(captureByDefault('https://m.facebook.com/story.php?id=1')).toBe(true);
    expect(captureByDefault('https://www.instagram.com/p/abc/')).toBe(true);
    expect(captureByDefault('https://www.threads.net/@a/post/x')).toBe(true);
    expect(captureByDefault('https://example.substack.com/p/x')).toBe(false);
    expect(captureByDefault('https://notfacebook.com/x')).toBe(false);
    expect(captureByDefault('not a url')).toBe(false);
  });
});
