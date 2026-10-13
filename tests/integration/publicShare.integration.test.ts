/**
 * Public collection links (business rules 19, 20) through the real
 * public-collection edge function. Needs local Supabase with functions served
 * (`npx supabase start` + `npx supabase functions serve`). Same env as
 * collections.integration.test.ts.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.SMART_LINK_URL;
const ANON_KEY = process.env.SMART_LINK_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SMART_LINK_SERVICE_ROLE_KEY;
const USER_A = process.env.SMART_LINK_USER_A;

const configured = !!URL && !!ANON_KEY && !!SERVICE_ROLE_KEY && !!USER_A;
const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);

function fetchPublic(slug: string) {
  return fetch(`${URL}/functions/v1/public-collection`, {
    method: 'POST',
    headers: { apikey: ANON_KEY as string, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  });
}

describe.skipIf(!configured)('public collection share (integration)', () => {
  let owner: SupabaseClient;
  let admin: SupabaseClient;
  let userId: string;
  let collectionId: string;
  let itemId: string;
  const imagePath = () => `${userId}/itest-share.jpg`;

  const share = (enabled: boolean, notes = false, images = false) =>
    owner.rpc('set_collection_sharing', {
      p_collection: collectionId,
      p_enabled: enabled,
      p_share_notes: notes,
      p_share_images: images,
    });

  beforeAll(async () => {
    admin = createClient(URL as string, SERVICE_ROLE_KEY as string, { auth: { persistSession: false } });
    const [email, password] = (USER_A as string).split(':');
    owner = createClient(URL as string, ANON_KEY as string, {
      auth: { persistSession: false, storageKey: 'itest-share' },
    });
    const { data } = await owner.auth.signInWithPassword({ email, password });
    userId = data.user?.id as string;
    await admin.storage.from('screenshots').upload(imagePath(), PNG, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    const item = await admin
      .from('items')
      .insert({
        user_id: userId,
        note: 'private note',
        title: 'Public title',
        url: 'https://example.com/a',
        image_path: imagePath(),
        source: 'web',
        channel: 'manual',
      })
      .select('id')
      .single();
    itemId = item.data?.id as string;
    const col = await owner
      .from('collections')
      .insert({ user_id: userId, name: 'itest share' })
      .select('id')
      .single();
    collectionId = col.data?.id as string;
    await owner
      .from('collection_items')
      .insert({ collection_id: collectionId, item_id: itemId, user_id: userId });
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.from('collections').delete().eq('id', collectionId);
    await admin.from('items').delete().eq('id', itemId);
    await admin.storage.from('screenshots').remove([imagePath()]);
  });

  it('shows url and title but hides note and screenshot by default', async () => {
    const { data: slug } = await share(true);
    expect(slug).toMatch(/^[A-Za-z0-9_-]{24}$/);
    const res = await fetchPublic(slug as string);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('itest share');
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ url: 'https://example.com/a', title: 'Public title', note: null, image_url: null });
    expect(JSON.stringify(body)).not.toContain(imagePath());
  });

  it('includes notes and a signed screenshot url only when opted in, same link', async () => {
    const { data: first } = await share(true);
    const { data: second } = await share(true, true, true);
    expect(second).toBe(first);
    const body = await (await fetchPublic(second as string)).json();
    expect(body.items[0].note).toBe('private note');
    expect(body.items[0].image_url).toContain('/object/sign/screenshots/');
  });

  it('turning sharing off kills the old link; on again gives a new one', async () => {
    const { data: old } = await share(true);
    await share(false);
    expect((await fetchPublic(old as string)).status).toBe(404);
    const { data: fresh } = await share(true);
    expect(fresh).not.toBe(old);
    expect((await fetchPublic(old as string)).status).toBe(404);
    expect((await fetchPublic(fresh as string)).status).toBe(200);
  });

  it('cannot read the tables or the SQL function anonymously', async () => {
    const anon = createClient(URL as string, ANON_KEY as string, {
      auth: { persistSession: false, storageKey: 'itest-anon' },
    });
    const { data: rows } = await anon.from('collections').select('*');
    expect(rows ?? []).toEqual([]);
    const { error } = await anon.rpc('public_collection', { p_slug: 'x' });
    expect(error).not.toBeNull();
  });

  it('another user cannot share my collection', async () => {
    const anon = createClient(URL as string, ANON_KEY as string, {
      auth: { persistSession: false, storageKey: 'itest-b' },
    });
    const [email, password] = (process.env.SMART_LINK_USER_B as string).split(':');
    await anon.auth.signInWithPassword({ email, password });
    const { error } = await anon.rpc('set_collection_sharing', {
      p_collection: collectionId,
      p_enabled: true,
    });
    expect(error).not.toBeNull();
  });
});
