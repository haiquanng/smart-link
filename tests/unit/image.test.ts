import { describe, expect, it } from 'vitest';
import { checkImageFile, fitWithin } from '@/lib/image';

describe('fitWithin', () => {
  it('scales the longest edge down to the max, keeping the ratio', () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });

  it('never upscales', () => {
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });

  it('never returns a zero edge', () => {
    expect(fitWithin(10000, 1, 2000)).toEqual({ width: 2000, height: 1 });
  });
});

describe('checkImageFile', () => {
  it('accepts common photo types', () => {
    expect(checkImageFile({ name: 'a.jpg', type: 'image/jpeg' })).toBe(true);
    expect(checkImageFile({ name: 'a.png', type: 'image/png' })).toBe(true);
    expect(checkImageFile({ name: 'a.webp', type: 'image/webp' })).toBe(true);
    expect(checkImageFile({ name: 'a.heic', type: 'image/heic' })).toBe(true);
  });

  it('accepts HEIC/HEIF with an empty MIME type (common on iOS/Windows)', () => {
    expect(checkImageFile({ name: 'IMG_1.HEIC', type: '' })).toBe(true);
    expect(checkImageFile({ name: 'IMG_1.heif', type: '' })).toBe(true);
  });

  it('rejects gif, pdf, video and unknown files', () => {
    expect(checkImageFile({ name: 'a.gif', type: 'image/gif' })).toBe(false);
    expect(checkImageFile({ name: 'a.pdf', type: 'application/pdf' })).toBe(false);
    expect(checkImageFile({ name: 'a.mp4', type: 'video/mp4' })).toBe(false);
    expect(checkImageFile({ name: 'a.txt', type: '' })).toBe(false);
  });
});
