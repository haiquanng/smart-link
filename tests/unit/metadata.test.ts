import { describe, expect, it } from 'vitest';
import { parseMetadata } from '@/lib/metadata';

describe('parseMetadata', () => {
  it('prefers Open Graph title and image', () => {
    const html = `
      <meta property="og:title" content="Định giá SaaS">
      <meta property="og:image" content="https://cdn.test/a.jpg">
      <title>fallback</title>`;
    expect(parseMetadata(html)).toEqual({
      title: 'Định giá SaaS',
      image: 'https://cdn.test/a.jpg',
    });
  });

  it('handles attributes in any order and single quotes', () => {
    const html = `<meta content='Hello' property='og:title'>`;
    expect(parseMetadata(html).title).toBe('Hello');
  });

  it('falls back to <title> when no og:title', () => {
    expect(parseMetadata('<title>  Just   a title </title>').title).toBe(
      'Just a title',
    );
  });

  it('decodes HTML entities', () => {
    const html = `<meta property="og:title" content="Tom &amp; Jerry &#39;99">`;
    expect(parseMetadata(html).title).toBe("Tom & Jerry '99");
  });

  it('uses twitter card as a fallback', () => {
    const html = `<meta name="twitter:image" content="https://cdn.test/t.png">`;
    expect(parseMetadata(html).image).toBe('https://cdn.test/t.png');
  });

  it('drops a non-http(s) image', () => {
    const html = `<meta property="og:image" content="data:image/png;base64,xxx">`;
    expect(parseMetadata(html).image).toBeUndefined();
  });

  it('returns empty object when there is nothing to extract', () => {
    expect(parseMetadata('<p>no meta here</p>')).toEqual({});
  });
});
