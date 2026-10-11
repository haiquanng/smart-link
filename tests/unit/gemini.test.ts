import { describe, expect, it } from 'vitest';
import {
  EMBEDDING_DIMS,
  embeddingText,
  parseEmbedResponse,
  parseGenerateResponse,
  queryEmbeddingText,
} from '@/lib/gemini';

function generateBody(text: string): unknown {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

describe('parseGenerateResponse', () => {
  const valid = { ocr_text: '', title: 't', summary: 's', tags: ['a'] };

  it('parses a valid structured response', () => {
    expect(parseGenerateResponse(generateBody(JSON.stringify(valid)))).toEqual(valid);
  });

  it('returns null for malformed JSON text', () => {
    expect(parseGenerateResponse(generateBody('{not json'))).toBeNull();
  });

  it('returns null when fields are missing or mistyped', () => {
    expect(
      parseGenerateResponse(generateBody(JSON.stringify({ title: 't' }))),
    ).toBeNull();
    expect(
      parseGenerateResponse(generateBody(JSON.stringify({ ...valid, tags: 'a' }))),
    ).toBeNull();
  });

  it('returns null for a response without candidates (e.g. blocked)', () => {
    expect(parseGenerateResponse({ promptFeedback: { blockReason: 'SAFETY' } })).toBeNull();
    expect(parseGenerateResponse(null)).toBeNull();
  });
});

describe('parseEmbedResponse', () => {
  it('accepts exactly the expected dimensions', () => {
    const values = Array.from({ length: EMBEDDING_DIMS }, () => 0.1);
    expect(parseEmbedResponse({ embedding: { values } })).toEqual(values);
  });

  it('rejects wrong length or shape', () => {
    expect(parseEmbedResponse({ embedding: { values: [0.1] } })).toBeNull();
    expect(parseEmbedResponse({})).toBeNull();
  });
});

describe('embeddingText', () => {
  it('formats title, note, summary and ocr', () => {
    expect(
      embeddingText({ title: 'T', note: 'N', summary: 'S', ocr: 'O' }),
    ).toBe('title: T | text: N\nS\nO');
  });

  it('uses "none" for a missing title and skips empty parts', () => {
    expect(
      embeddingText({ title: null, note: null, summary: 'S', ocr: null }),
    ).toBe('title: none | text: \nS');
  });

  it('truncates to 6000 chars', () => {
    const text = embeddingText({ title: 'T', note: 'n'.repeat(9000), summary: null, ocr: null });
    expect(text).toHaveLength(6000);
  });
});

describe('queryEmbeddingText', () => {
  it('uses the search-result task format', () => {
    expect(queryEmbeddingText('  dinh gia SaaS ')).toBe(
      'task: search result | query: dinh gia SaaS',
    );
  });
});
