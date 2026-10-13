/**
 * Integration tests for public.hit_rate_limit (the counter behind ingest and
 * search 429s). Skipped unless a Supabase project is configured:
 *   SMART_LINK_URL=<supabase url> \
 *   SMART_LINK_SERVICE_ROLE_KEY=<service role key> \
 *   SMART_LINK_TEST_USER_ID=<uuid> \
 *   SMART_LINK_OTHER_USER_ID=<a second uuid> \
 *   SMART_LINK_ANON_KEY=<anon key> \
 *   npm run test -- tests/integration
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SMART_LINK_URL;
const SERVICE_ROLE_KEY = process.env.SMART_LINK_SERVICE_ROLE_KEY;
const USER = process.env.SMART_LINK_TEST_USER_ID;
const OTHER = process.env.SMART_LINK_OTHER_USER_ID;
const ANON_KEY = process.env.SMART_LINK_ANON_KEY;

const configured = !!SUPABASE_URL && !!SERVICE_ROLE_KEY && !!USER && !!OTHER;

describe.skipIf(!configured)('hit_rate_limit (integration)', () => {
  let admin: SupabaseClient;
  const bucket = `itest-${Date.now()}`;

  function hit(user: string, limit = 2) {
    return admin.rpc('hit_rate_limit', {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: 3600,
      p_user: user,
    });
  }

  beforeAll(() => {
    admin = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false },
    });
  });

  afterAll(async () => {
    await admin.from('rate_limits').delete().eq('bucket', bucket);
  });

  it('allows hits up to the limit, then returns seconds to wait', async () => {
    expect((await hit(USER as string)).data).toBe(0);
    expect((await hit(USER as string)).data).toBe(0);
    const third = await hit(USER as string);
    expect(third.error).toBeNull();
    expect(third.data).toBeGreaterThan(0);
    expect(third.data).toBeLessThanOrEqual(3600);
  });

  it('does not count against another user', async () => {
    expect((await hit(OTHER as string)).data).toBe(0);
  });

  it.skipIf(!ANON_KEY)('is not callable with the anon key', async () => {
    const anon = createClient(SUPABASE_URL as string, ANON_KEY as string, {
      auth: { persistSession: false },
    });
    const { error } = await anon.rpc('hit_rate_limit', {
      p_bucket: bucket,
      p_limit: 1,
      p_window_seconds: 60,
      p_user: USER,
    });
    expect(error).not.toBeNull();
  });

  it.skipIf(!ANON_KEY)('hides the counters table from clients', async () => {
    const anon = createClient(SUPABASE_URL as string, ANON_KEY as string, {
      auth: { persistSession: false },
    });
    const { data } = await anon.from('rate_limits').select('*');
    expect(data ?? []).toEqual([]);
  });
});
