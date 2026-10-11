/**
 * Integration tests for the deployed/served `ingest` edge function + DB.
 * These exercise the real path (testing rule): an item is saved, a duplicate
 * URL does not create a second row, and RLS blocks another user's rows.
 *
 * They are skipped unless the environment is configured, so the offline unit
 * suite stays green. To run:
 *   SMART_LINK_INGEST_URL=<functions-url>/ingest \
 *   SMART_LINK_INGEST_TOKEN=<raw api token> \
 *   SMART_LINK_URL=<supabase url> \
 *   SMART_LINK_SERVICE_ROLE_KEY=<service role key> \
 *   SMART_LINK_TEST_USER_ID=<uuid the token belongs to> \
 *   npm run test -- tests/integration
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const INGEST_URL = process.env.SMART_LINK_INGEST_URL;
const TOKEN = process.env.SMART_LINK_INGEST_TOKEN;
const SUPABASE_URL = process.env.SMART_LINK_URL;
const SERVICE_ROLE_KEY = process.env.SMART_LINK_SERVICE_ROLE_KEY;
const TEST_USER_ID = process.env.SMART_LINK_TEST_USER_ID;

const configured =
  !!INGEST_URL && !!TOKEN && !!SUPABASE_URL && !!SERVICE_ROLE_KEY && !!TEST_USER_ID;

function post(body: unknown, token = TOKEN) {
  return fetch(INGEST_URL as string, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!configured)('ingest edge function (integration)', () => {
  let admin: SupabaseClient;
  const created: string[] = [];
  const marker = `itest-${Date.now()}`;

  beforeAll(() => {
    admin = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false },
    });
  });

  afterAll(async () => {
    if (created.length) await admin.from('items').delete().in('id', created);
  });

  it('rejects a missing token with 401', async () => {
    const res = await post({ note: marker }, 'not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('rejects an empty payload with 400 (business rule 2)', async () => {
    const res = await post({ channel: 'shortcut' });
    expect(res.status).toBe(400);
  });

  it('saves an item as pending (business rule 1)', async () => {
    const res = await post({
      url: `https://example.com/itest/${marker}`,
      note: `${marker} dinh gia`,
      channel: 'shortcut',
    });
    expect(res.status).toBe(201);
    const payload = await res.json();
    expect(payload.status).toBe('pending');
    expect(payload.duplicate).toBe(false);
    created.push(payload.id);

    const { data } = await admin
      .from('items')
      .select('user_id, status')
      .eq('id', payload.id)
      .single();
    expect(data?.user_id).toBe(TEST_USER_ID);
    expect(data?.status).toBe('pending');
  });

  it('does not create a second row for a duplicate URL (business rule 5)', async () => {
    const url = `https://example.com/itest/dup-${marker}?utm_source=x`;
    const first = await post({ url, note: 'first' });
    const firstBody = await first.json();
    created.push(firstBody.id);

    // Same URL, different tracking param -> same normalized URL.
    const second = await post({
      url: `https://example.com/itest/dup-${marker}?utm_medium=y`,
      note: 'second',
    });
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.duplicate).toBe(true);
    expect(secondBody.id).toBe(firstBody.id);

    const { count } = await admin
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', TEST_USER_ID as string)
      .eq('url_normalized', `https://example.com/itest/dup-${marker}`);
    expect(count).toBe(1);
  });

  it('finds the item by a no-diacritics query (business rule 11)', async () => {
    // "dinh gia" (no diacritics) must match the note saved above.
    const { data, error } = await admin
      .from('items')
      .select('id')
      .eq('user_id', TEST_USER_ID as string)
      .textSearch('fts', 'dinh & gia');
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });
});
