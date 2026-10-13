// Authoritative copy, mirrored in supabase/functions/_shared/reminderSchedule.ts.

/** Local hour when the daily Resurface reminder goes out. */
export const REMINDER_HOUR = 19;

function parts(now: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const get = (type: string) => fmt.formatToParts(now).find((p) => p.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

/** The subscriber's local date and hour; an unknown zone counts as UTC. */
export function localDay(now: Date, timeZone: string): { date: string; hour: number } {
  try {
    return parts(now, timeZone);
  } catch {
    return parts(now, 'UTC');
  }
}

/** At most one reminder per local day, sent at or after REMINDER_HOUR. */
export function isReminderDue(now: Date, timeZone: string, lastSentAt: string | null): boolean {
  const today = localDay(now, timeZone);
  if (today.hour < REMINDER_HOUR) return false;
  if (!lastSentAt) return true;
  return localDay(new Date(lastSentAt), timeZone).date !== today.date;
}
