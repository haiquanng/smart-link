import { describe, expect, it } from 'vitest';
import { normalizeTags, planAiPatch } from '@/lib/aiPatch';

const ai = {
  ocr_text: 'chữ trong ảnh',
  title: 'Tiêu đề AI',
  summary: 'Tóm tắt.',
  tags: ['SaaS', 'định giá'],
};

describe('planAiPatch', () => {
  it('never touches note (business rule 9)', () => {
    const patch = planAiPatch({ title: null, hasImage: true }, ai);
    expect(patch).not.toHaveProperty('note');
  });

  it('uses the AI title only when the item has none, and marks origin', () => {
    expect(planAiPatch({ title: null, hasImage: false }, ai)).toMatchObject({
      title: 'Tiêu đề AI',
      title_origin: 'ai',
    });
    expect(planAiPatch({ title: '  ', hasImage: false }, ai).title).toBe('Tiêu đề AI');
  });

  it('keeps a scraped title and does not set title_origin', () => {
    const patch = planAiPatch({ title: 'Scraped', hasImage: false }, ai);
    expect(patch).not.toHaveProperty('title');
    expect(patch).not.toHaveProperty('title_origin');
  });

  it('skips an empty AI title', () => {
    const patch = planAiPatch({ title: null, hasImage: false }, { ...ai, title: ' ' });
    expect(patch).not.toHaveProperty('title');
  });

  it('always sets summary', () => {
    expect(planAiPatch({ title: 'x', hasImage: false }, ai).summary).toBe('Tóm tắt.');
  });

  it('stores OCR only when an image is present and text is non-empty', () => {
    expect(planAiPatch({ title: null, hasImage: true }, ai).content_text).toBe(
      'chữ trong ảnh',
    );
    expect(planAiPatch({ title: null, hasImage: false }, ai)).not.toHaveProperty(
      'content_text',
    );
    expect(
      planAiPatch({ title: null, hasImage: true }, { ...ai, ocr_text: '  ' }),
    ).not.toHaveProperty('content_text');
  });
});

describe('normalizeTags', () => {
  it('turns snake_case tags from the model into spaced words', () => {
    expect(normalizeTags(['định_giá', 'giáo__dục', '_saas_'])).toEqual([
      'định giá',
      'giáo dục',
      'saas',
    ]);
  });

  it('trims, lowercases, dedupes and drops empties', () => {
    expect(normalizeTags([' SaaS ', 'saas', '', '  ', 'Giá'])).toEqual(['saas', 'giá']);
  });

  it('caps at 5 tags of 30 chars', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(normalizeTags(many)).toHaveLength(5);
    expect(normalizeTags(['x'.repeat(50)])[0]).toHaveLength(30);
  });
});
