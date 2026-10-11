import { describe, expect, it } from 'vitest';
import { ingestPayloadSchema, parseIngestPayload } from '@/lib/ingestPayload';

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

  it('rejects a non-http(s) url', () => {
    const result = parseIngestPayload({ url: 'ftp://example.com/x' });
    expect(result.success).toBe(false);
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
