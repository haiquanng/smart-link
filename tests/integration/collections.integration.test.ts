/**
 * Collections RLS and membership rules against a real Supabase (local:
 * `npx supabase start`). Skipped unless configured:
 *   SMART_LINK_URL=<supabase url> SMART_LINK_ANON_KEY=<anon key> \
 *   SMART_LINK_SERVICE_ROLE_KEY=<service role key> \
 *   SMART_LINK_USER_A=<email:password> SMART_LINK_USER_B=<email:password> \
 *   npm run test -- tests/integration
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ITEM_COLUMNS } from '@/lib/itemColumns';

const URL = process.env.SMART_LINK_URL;
const ANON_KEY = process.env.SMART_LINK_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SMART_LINK_SERVICE_ROLE_KEY;
const USER_A = process.env.SMART_LINK_USER_A;
const USER_B = process.env.SMART_LINK_USER_B;

const configured = !!URL && !!ANON_KEY && !!SERVICE_ROLE_KEY && !!USER_A && !!USER_B;

async function signIn(cred: string): Promise<{ client: SupabaseClient; id: string }> {
  const [email, password] = cred.split(':');
  const client = createClient(URL as string, ANON_KEY as string, {
    auth: { persistSession: false, storageKey: `itest-${email}` },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error('sign in failed');
  return { client, id: data.user.id };
}

describe.skipIf(!configured)('collections (integration)', () => {
  let a: { client: SupabaseClient; id: string };
  let b: { client: SupabaseClient; id: string };
  let admin: SupabaseClient;
  let collectionA: string;
  let itemA: string;
  let itemB: string;

  beforeAll(async () => {
    admin = createClient(URL as string, SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false },
    });
    a = await signIn(USER_A as string);
    b = await signIn(USER_B as string);
    const ins = async (user: string, note: string) => {
      const { data, error } = await admin
        .from('items')
        .insert({ user_id: user, note, source: 'other', channel: 'manual' })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    };
    itemA = await ins(a.id, 'itest collection a');
    itemB = await ins(b.id, 'itest collection b');
    const { data, error } = await a.client
      .from('collections')
      .insert({ user_id: a.id, name: 'itest' })
      .select('id')
      .single();
    if (error) throw error;
    collectionA = data.id as string;
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.from('collections').delete().eq('id', collectionA);
    await admin.from('items').delete().in('id', [itemA, itemB].filter(Boolean));
  });

  it('adds an own item and counts it', async () => {
    const { error } = await a.client
      .from('collection_items')
      .insert({ collection_id: collectionA, item_id: itemA, user_id: a.id });
    expect(error).toBeNull();
    const { data } = await a.client.rpc('user_collections');
    expect(data.find((c: { id: string }) => c.id === collectionA)?.item_count).toBe(1);
  });

  it('lists the collection items through the membership embed', async () => {
    const { data, error } = await a.client
      .from('items')
      .select(`${ITEM_COLUMNS}, collection_items!inner()`)
      .eq('collection_items.collection_id', collectionA);
    expect(error).toBeNull();
    expect(data?.map((i) => i.id)).toEqual([itemA]);
    expect(data?.[0]).not.toHaveProperty('collection_items');
  });

  it("hides one user's collections from another", async () => {
    const { data } = await b.client.from('collections').select('id').eq('id', collectionA);
    expect(data).toEqual([]);
    const { data: counts } = await b.client.rpc('user_collections');
    expect(counts).toEqual([]);
  });

  it("blocks adding an item to another user's collection", async () => {
    const { error } = await b.client
      .from('collection_items')
      .insert({ collection_id: collectionA, item_id: itemB, user_id: b.id });
    expect(error).not.toBeNull();
  });

  it("blocks adding another user's item to an own collection", async () => {
    const { error } = await a.client
      .from('collection_items')
      .insert({ collection_id: collectionA, item_id: itemB, user_id: a.id });
    expect(error).not.toBeNull();
  });

  it('rejects an empty name', async () => {
    const { error } = await a.client.from('collections').insert({ user_id: a.id, name: '   ' });
    expect(error).not.toBeNull();
  });

  it('keeps items when the collection is deleted', async () => {
    const { data, error } = await a.client
      .from('collections')
      .insert({ user_id: a.id, name: 'itest temp' })
      .select('id')
      .single();
    expect(error).toBeNull();
    await a.client
      .from('collection_items')
      .insert({ collection_id: data?.id, item_id: itemA, user_id: a.id });
    await a.client.from('collections').delete().eq('id', data?.id);
    const { data: item } = await a.client.from('items').select('id').eq('id', itemA);
    expect(item).toHaveLength(1);
  });
});
