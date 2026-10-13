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
 *   SMART_LINK_ANON_KEY=<anon key, only for the storage RLS test> \
 *   npm run test -- tests/integration
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const INGEST_URL = process.env.SMART_LINK_INGEST_URL;
const TOKEN = process.env.SMART_LINK_INGEST_TOKEN;
const SUPABASE_URL = process.env.SMART_LINK_URL;
const SERVICE_ROLE_KEY = process.env.SMART_LINK_SERVICE_ROLE_KEY;
const TEST_USER_ID = process.env.SMART_LINK_TEST_USER_ID;
const ANON_KEY = process.env.SMART_LINK_ANON_KEY;

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

describe.skipIf(!configured)('ingest screenshots (integration)', () => {
  let admin: SupabaseClient;
  const items: string[] = [];
  const objects: string[] = [];
  const marker = `shot-${Date.now()}`;

  async function putObject(userId = TEST_USER_ID as string): Promise<string> {
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error } = await admin.storage
      .from('screenshots')
      .upload(path, new Uint8Array([0xff, 0xd8, 0xff]) /* jsdom's Blob never finishes uploading */, {
        contentType: 'image/jpeg',
      });
    expect(error).toBeNull();
    objects.push(path);
    return path;
  }

  async function ingest(body: Record<string, unknown>) {
    const res = await post({ channel: 'upload', ...body });
    const payload = await res.json();
    if (payload.id) items.push(payload.id);
    return { status: res.status, payload };
  }

  async function row(id: string) {
    const { data } = await admin
      .from('items')
      .select('source, channel, url, url_normalized, image_path, note')
      .eq('id', id)
      .single();
    return data;
  }

  beforeAll(() => {
    admin = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false },
    });
  });

  afterAll(async () => {
    if (items.length) await admin.from('items').delete().in('id', items);
    if (objects.length) await admin.storage.from('screenshots').remove(objects);
  });

  it('saves an image-only item as a screenshot via upload', async () => {
    const path = await putObject();
    const { status, payload } = await ingest({ image_path: path });
    expect(status).toBe(201);
    expect(await row(payload.id)).toMatchObject({
      source: 'screenshot',
      channel: 'upload',
      image_path: path,
    });
  });

  it('rejects an image path under another user (403)', async () => {
    const foreign = `${crypto.randomUUID()}/${crypto.randomUUID()}.jpg`;
    const { status } = await ingest({ image_path: foreign });
    expect(status).toBe(403);
  });

  it('rejects a path whose object does not exist (400)', async () => {
    const missing = `${TEST_USER_ID}/${crypto.randomUUID()}.jpg`;
    const { status, payload } = await ingest({ image_path: missing });
    expect(status).toBe(400);
    expect(payload.error).toBe('image not found');
  });

  it('attaches the image to an existing item without one (200)', async () => {
    const url = `https://example.com/itest/${marker}-attach`;
    const first = await ingest({ url, note: 'first', channel: 'shortcut' });
    const path = await putObject();
    const second = await ingest({ url, note: 'second', image_path: path });
    expect(second.status).toBe(200);
    expect(second.payload).toMatchObject({ id: first.payload.id, duplicate: true });
    expect(await row(first.payload.id)).toMatchObject({
      image_path: path,
      note: 'first\nsecond',
    });
  });

  it('keeps a second screenshot of the same URL as its own item', async () => {
    const url = `https://example.com/itest/${marker}-two`;
    const a = await ingest({ url, image_path: await putObject() });
    const b = await ingest({ url, image_path: await putObject() });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(b.payload.id).not.toBe(a.payload.id);
    const second = await row(b.payload.id);
    expect(second?.url).toBe(url);
    expect(second?.url_normalized).toBeNull();
  });

  it.skipIf(!ANON_KEY)('blocks another user from reading or deleting the object', async () => {
    const path = await putObject();
    const email = `itest-${marker}@example.com`;
    const password = `pw-${crypto.randomUUID()}`;
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    try {
      const other = createClient(SUPABASE_URL as string, ANON_KEY as string, {
        auth: { persistSession: false },
      });
      await other.auth.signInWithPassword({ email, password });

      const signed = await other.storage.from('screenshots').createSignedUrl(path, 60);
      expect(signed.data).toBeNull();

      await other.storage.from('screenshots').remove([path]);
      const { data: stillThere } = await admin.storage
        .from('screenshots')
        .exists(path);
      expect(stillThere).toBe(true);
    } finally {
      if (created.user) await admin.auth.admin.deleteUser(created.user.id);
    }
  });
});
