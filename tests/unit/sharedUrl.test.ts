import { describe, expect, it } from 'vitest';
import { coerceSharedUrl } from '@/lib/sharedUrl';

describe('coerceSharedUrl', () => {
  it('keeps a clean http(s) URL', () => {
    expect(coerceSharedUrl('https://www.facebook.com/share/1KWvE4QeZK/')).toEqual({
      url: 'https://www.facebook.com/share/1KWvE4QeZK/',
    });
  });

  it('extracts the URL from a text blob shared by Instagram/Threads', () => {
    expect(
      coerceSharedUrl('Xem reel này nhé https://www.instagram.com/reel/C9xYz1AbCdE/?igshid=abc.'),
    ).toEqual({ url: 'https://www.instagram.com/reel/C9xYz1AbCdE/?igshid=abc' });
  });

  it('adds https:// to a bare domain link', () => {
    expect(coerceSharedUrl('facebook.com/groups/123/posts/456')).toEqual({
      url: 'https://facebook.com/groups/123/posts/456',
    });
    expect(coerceSharedUrl('www.example.com')).toEqual({ url: 'https://www.example.com' });
  });

  it('turns text without any link into leftover text instead of failing', () => {
    expect(coerceSharedUrl('một đoạn chữ không có link')).toEqual({
      text: 'một đoạn chữ không có link',
    });
  });

  it('never accepts non-http schemes', () => {
    expect(coerceSharedUrl('javascript:alert(1)')).toEqual({ text: 'javascript:alert(1)' });
  });

  it('returns nothing for empty input', () => {
    expect(coerceSharedUrl('   ')).toEqual({});
  });
});
