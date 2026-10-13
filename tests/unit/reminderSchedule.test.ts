import { describe, expect, it } from 'vitest';
import { isReminderDue, localDay, REMINDER_HOUR } from '@/lib/reminderSchedule';

describe('reminder schedule', () => {
  it('uses the subscriber timezone for the day and hour', () => {
    // 12:30 UTC = 19:30 in Ho Chi Minh City (UTC+7).
    const now = new Date('2026-10-13T12:30:00Z');
    expect(localDay(now, 'Asia/Ho_Chi_Minh')).toEqual({ date: '2026-10-13', hour: 19 });
    expect(localDay(now, 'UTC')).toEqual({ date: '2026-10-13', hour: 12 });
  });

  it('is due once a day, at or after the reminder hour', () => {
    const tz = 'Asia/Ho_Chi_Minh';
    const evening = new Date('2026-10-13T12:05:00Z'); // 19:05 local
    const morning = new Date('2026-10-13T02:00:00Z'); // 09:00 local
    expect(REMINDER_HOUR).toBe(19);
    expect(isReminderDue(evening, tz, null)).toBe(true);
    expect(isReminderDue(morning, tz, null)).toBe(false);
    // Already sent earlier today (local), not again.
    expect(isReminderDue(evening, tz, '2026-10-13T12:01:00Z')).toBe(false);
    // Sent yesterday: due again.
    expect(isReminderDue(evening, tz, '2026-10-12T12:01:00Z')).toBe(true);
  });

  it('falls back to UTC for an unknown timezone instead of throwing', () => {
    expect(localDay(new Date('2026-10-13T20:00:00Z'), 'Not/AZone')).toEqual({ date: '2026-10-13', hour: 20 });
  });
});
