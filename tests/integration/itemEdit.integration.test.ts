/**
 * Editing items (business rules 8, 9) and the user-facing enrich modes,
 * against local Supabase with functions served. Same env as
 * collections.integration.test.ts. No Gemini key locally, so enrich skips AI.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.SMART_LINK_URL;
const ANON_KEY = process.env.SMART_LINK_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SMART_LINK_SERVICE_ROLE_KEY;
const USER_A = process.env.SMART_LINK_USER_A;
const USER_B = process.env.SMART_LINK_USER_B;

const configured = !!URL && !!ANON_KEY && !!SERVICE_ROLE_KEY && !!USER_A && !!USER_B;

async function signIn(cred: string, key: string) {
  const [email, password] = cred.split(':');
  const client = createClient(URL as string, ANON_KEY as string, {
    auth: { persistSession: false, storageKey: key },
  });
  const { data } = await client.auth.signInWithPassword({ email, password });
  return { client, id: data.user?.id as string, token: data.session?.access_token as string };
}

function callEnrich(token: string, body: unknown) {
  return fetch(`${URL}/functions/v1/enrich`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe.skipIf(!configured)('item editing (integration)', () => {
  let admin: SupabaseClient;
  let a: Awaited<ReturnType<typeof signIn>>;
  let b: Awaited<ReturnType<typeof signIn>>;
  let itemId: string;
  let aiTagId: string;
  const tagName = `itest-ai-${Date.now()}`;

  beforeAll(async () => {
    admin = createClient(URL as string, SERVICE_ROLE_KEY as string, { auth: { persistSession: false } });
    a = await signIn(USER_A as string, 'itest-edit-a');
    b = await signIn(USER_B as string, 'itest-edit-b');
    const item = await admin
      .from('items')
      .insert({
        user_id: a.id,
        note: 'itest edit',
        title: 'AI made',
        title_origin: 'ai',
        summary: 'AI summary',
        source: 'other',
        channel: 'manual',
        status: 'enrich_failed',
      })
      .select('id')
      .single();
    itemId = item.data?.id as string;
    const tag = await admin.from('tags').insert({ user_id: a.id, name: tagName }).select('id').single();
    aiTagId = tag.data?.id as string;
    await admin.from('item_tags').insert({ item_id: itemId, tag_id: aiTagId, user_id: a.id, origin: 'ai' });
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.from('items').delete().eq('id', itemId);
    await admin.from('tags').delete().eq('id', aiTagId);
  });

  it('lets the owner edit note and title, and full text sees it at once', async () => {
    const { error } = await a.client
      .from('items')
      .update({ note: 'quán chè ngon itest', title: 'Của tôi', title_origin: 'user', summary: null })
      .eq('id', itemId);
    expect(error).toBeNull();
    const { data } = await a.client.rpc('search_items', { query: 'quan che itest', filters: {} });
    expect((data as { id: string }[]).map((r) => r.id)).toContain(itemId);
  });

  it('lets the owner remove an AI tag', async () => {
    const { error } = await a.client.from('item_tags').delete().eq('item_id', itemId).eq('tag_id', aiTagId);
    expect(error).toBeNull();
    const { data } = await admin.from('item_tags').select('tag_id').eq('item_id', itemId);
    expect(data).toEqual([]);
  });

  it('blocks tagging another user\'s item or using another user\'s tag', async () => {
    const otherTag = await b.client.from('tags').insert({ user_id: b.id, name: tagName }).select('id').single();
    try {
      const onAItem = await b.client
        .from('item_tags')
        .insert({ item_id: itemId, tag_id: otherTag.data?.id, user_id: b.id, origin: 'user' });
      expect(onAItem.error).not.toBeNull();
      const withBTag = await a.client
        .from('item_tags')
        .insert({ item_id: itemId, tag_id: otherTag.data?.id, user_id: a.id, origin: 'user' });
      expect(withBTag.error).not.toBeNull();
    } finally {
      await admin.from('tags').delete().eq('id', otherTag.data?.id);
    }
  });

  it('embed mode works for the owner and is 404 for anyone else', async () => {
    const own = await callEnrich(a.token, { item_id: itemId, mode: 'embed' });
    expect(own.status).toBe(200);
    expect(await own.json()).toMatchObject({ embedded: 'skipped' });
    const other = await callEnrich(b.token, { item_id: itemId, mode: 'embed' });
    expect(other.status).toBe(404);
  });

  it('manual retry re-enriches but keeps the user title and the removed AI tag gone', async () => {
    const res = await callEnrich(a.token, { item_id: itemId, mode: 'retry' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ready' });
    const { data } = await admin.from('items').select('title, title_origin, status').eq('id', itemId).single();
    expect(data).toEqual({ title: 'Của tôi', title_origin: 'user', status: 'ready' });
    const { data: tags } = await admin.from('item_tags').select('tag_id').eq('item_id', itemId);
    expect(tags).toEqual([]);
  });

  it('rejects a bad mode and an unauthenticated call', async () => {
    expect((await callEnrich(a.token, { item_id: itemId, mode: 'nope' })).status).toBe(400);
    expect((await callEnrich('not-a-jwt', { item_id: itemId, mode: 'embed' })).status).toBe(403);
  });
});
