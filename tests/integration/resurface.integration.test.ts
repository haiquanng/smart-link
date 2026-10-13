/**
 * Resurface selection (business rules 15, 16) in resurface_today(). Uses
 * user B so other suites' items do not interfere. Same env as
 * collections.integration.test.ts.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.SMART_LINK_URL;
const ANON_KEY = process.env.SMART_LINK_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SMART_LINK_SERVICE_ROLE_KEY;
const USER_B = process.env.SMART_LINK_USER_B;

const configured = !!URL && !!ANON_KEY && !!SERVICE_ROLE_KEY && !!USER_B;
const DAY = 24 * 60 * 60 * 1000;
const TAG = 'rs-itest:';

describe.skipIf(!configured)('resurface_today (integration)', () => {
  let user: SupabaseClient;
  let admin: SupabaseClient;
  let userId: string;
  let day = 0;
  // A fresh "today" per test so stored picks never leak between tests.
  const today = () => `2030-01-${String(day).padStart(2, '0')}`;
  const picks = async () => {
    const { data, error } = await user.rpc('resurface_today', { p_today: today() }).select('note');
    if (error) throw error;
    // Other suites may own items for this user; only look at ours.
    return (data as { note: string }[])
      .map((r) => r.note)
      .filter((n) => n.startsWith(TAG))
      .map((n) => n.slice(TAG.length));
  };
  const seed = (rows: { note: string; ageDays: number; seen?: boolean }[]) =>
    admin.from('items').insert(
      rows.map((r) => ({
        user_id: userId,
        note: TAG + r.note,
        source: 'other',
        channel: 'manual',
        created_at: new Date(Date.now() - r.ageDays * DAY).toISOString(),
        seen_at: r.seen ? new Date().toISOString() : null,
      })),
    );

  beforeAll(async () => {
    admin = createClient(URL as string, SERVICE_ROLE_KEY as string, { auth: { persistSession: false } });
    user = createClient(URL as string, ANON_KEY as string, {
      auth: { persistSession: false, storageKey: 'itest-resurface' },
    });
    const [email, password] = (USER_B as string).split(':');
    const { data } = await user.auth.signInWithPassword({ email, password });
    userId = data.user?.id as string;
  });

  beforeEach(async () => {
    day += 1;
    await admin.from('items').delete().eq('user_id', userId).like('note', `${TAG}%`);
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.from('items').delete().eq('user_id', userId).like('note', `${TAG}%`);
    await admin.from('resurface_picks').delete().eq('user_id', userId);
  });

  it('picks at most 3 of the oldest unseen items at least 3 days old', async () => {
    await seed([
      { note: 'd10', ageDays: 10 },
      { note: 'd9', ageDays: 9 },
      { note: 'd8 seen', ageDays: 8, seen: true },
      { note: 'd7', ageDays: 7 },
      { note: 'd5', ageDays: 5 },
      { note: 'd2', ageDays: 2 },
    ]);
    expect(await picks()).toEqual(['d10', 'd9', 'd7']);
  });

  it('skips items younger than 3 days', async () => {
    await seed([
      { note: 'old', ageDays: 3.01 },
      { note: 'young', ageDays: 2.9 },
    ]);
    expect(await picks()).toEqual(['old']);
  });

  it('keeps the same picks all day and drops seen ones without replacing them', async () => {
    await seed([
      { note: 'a', ageDays: 9 },
      { note: 'b', ageDays: 8 },
      { note: 'c', ageDays: 7 },
      { note: 'd', ageDays: 6 },
    ]);
    expect(await picks()).toEqual(['a', 'b', 'c']);
    await admin.from('items').update({ seen_at: new Date().toISOString() }).eq('note', `${TAG}a`);
    expect(await picks()).toEqual(['b', 'c']);
  });

  it('reset lets seen items come back', async () => {
    await seed([{ note: 'seen', ageDays: 9, seen: true }]);
    expect(await picks()).toEqual([]);
    const { error } = await user.rpc('resurface_reset');
    expect(error).toBeNull();
    expect(await picks()).toEqual(['seen']);
  });

  it('never picks another user\'s items', async () => {
    const otherId = process.env.SMART_LINK_TEST_USER_ID as string;
    const { data } = await admin
      .from('items')
      .insert({ user_id: otherId, note: `${TAG}not mine`, source: 'other', channel: 'manual', created_at: new Date(Date.now() - 30 * DAY).toISOString() })
      .select('id')
      .single();
    try {
      expect(await picks()).not.toContain('not mine');
    } finally {
      await admin.from('items').delete().eq('id', data?.id);
    }
  });
});
