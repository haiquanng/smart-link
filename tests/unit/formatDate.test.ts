import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '@/lib/formatDate';

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-11T12:00:00Z');

  it('shows "vừa xong" under a minute', () => {
    expect(formatRelativeTime('2026-10-11T11:59:30Z', now)).toBe('vừa xong');
  });
  it('shows minutes', () => {
    expect(formatRelativeTime('2026-10-11T11:45:00Z', now)).toBe('15 phút trước');
  });
  it('shows hours', () => {
    expect(formatRelativeTime('2026-10-11T09:00:00Z', now)).toBe('3 giờ trước');
  });
  it('shows days under a week', () => {
    expect(formatRelativeTime('2026-10-09T12:00:00Z', now)).toBe('2 ngày trước');
  });
  it('shows a formatted date beyond a week', () => {
    expect(formatRelativeTime('2026-09-01T12:00:00Z', now)).toMatch(
      /\d{2}\/\d{2}\/\d{4}/,
    );
  });
});
