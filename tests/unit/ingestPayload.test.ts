import { describe, expect, it } from 'vitest';
import {
  imagePathOwnedBy,
  ingestPayloadSchema,
  parseIngestPayload,
} from '@/lib/ingestPayload';

describe('ingestPayloadSchema', () => {
  it('accepts a url + note payload and defaults channel to shortcut', () => {
    const result = parseIngestPayload({
      url: 'https://www.facebook.com/share/1KWvE4QeZK/',
      note: 'cach dinh gia SaaS',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channel).toBe('shortcut');
      expect(result.data.note).toBe('cach dinh gia SaaS');
    }
  });

  it('accepts a note-only payload (no URL shared)', () => {
    const result = parseIngestPayload({ note: 'idea from a story' });
    expect(result.success).toBe(true);
  });

  it('accepts a url-only payload (note dictation skipped)', () => {
    const result = parseIngestPayload({ url: 'https://substack.com/p/x' });
    expect(result.success).toBe(true);
  });

  it('rejects a payload with neither url nor note (business rule 2)', () => {
    const result = parseIngestPayload({ channel: 'shortcut' });
    expect(result.success).toBe(false);
  });

  it('rejects empty/whitespace-only url and note as "neither present"', () => {
    const result = parseIngestPayload({ url: '   ', note: '' });
    expect(result.success).toBe(false);
  });

  it('keeps a non-http(s) value as note text instead of a url', () => {
    const result = parseIngestPayload({ url: 'ftp://example.com/x' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBeUndefined();
      expect(result.data.note).toBe('ftp://example.com/x');
    }
  });

  it('recovers the link from a shared text blob and keeps the user note', () => {
    const result = parseIngestPayload({
      url: 'Xem nè https://www.threads.net/@a/post/xyz',
      note: 'hay',
    });
    expect(result.success && result.data).toMatchObject({
      url: 'https://www.threads.net/@a/post/xyz',
      note: 'hay',
    });
  });

  it('rejects an unknown channel', () => {
    const result = ingestPayloadSchema.safeParse({
      url: 'https://example.com',
      channel: 'telegram',
    });
    expect(result.success).toBe(false);
  });

  it('trims the note', () => {
    const result = parseIngestPayload({ note: '  spaced  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.note).toBe('spaced');
  });
});

describe('image_path', () => {
  const uid = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';
  const oid = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

  it('accepts an image-only payload', () => {
    const result = parseIngestPayload({
      channel: 'upload',
      image_path: `${uid}/${oid}.jpg`,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a path that is not {uuid}/{uuid}.ext', () => {
    for (const bad of [
      '../etc/passwd',
      `${uid}/nested/${oid}.jpg`,
      `${uid}/${oid}.gif`,
      `${oid}.jpg`,
    ]) {
      expect(
        parseIngestPayload({ note: 'x', image_path: bad }).success,
      ).toBe(false);
    }
  });

  it('still rejects a payload with url, note and image all empty', () => {
    expect(parseIngestPayload({ url: ' ', note: '' }).success).toBe(false);
  });

  it('checks the path belongs to the user', () => {
    expect(imagePathOwnedBy(`${uid}/${oid}.jpg`, uid)).toBe(true);
    expect(imagePathOwnedBy(`${oid}/${oid}.jpg`, uid)).toBe(false);
    expect(imagePathOwnedBy(`${uid}x/${oid}.jpg`, uid)).toBe(false);
  });
});
