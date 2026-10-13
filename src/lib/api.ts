import type { Session } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { generateApiToken, hashApiToken } from '@/lib/apiToken';
import { sourceSchema, type Channel } from '@/lib/ingestPayload';
import { EMPTY_FILTERS, toRequestFilters, type SearchFilters } from '@/lib/searchParams';
import { ITEM_COLUMNS } from '@/lib/itemColumns';
import { collectionsApi } from '@/lib/collectionsApi';
import { fetchPublicCollection } from '@/lib/publicCollection';
import { resurfaceApi } from '@/lib/resurfaceApi';
import { itemEditApi } from '@/lib/itemEditApi';
import type { ApiToken, Item } from '@/types/item';


// Loose on purpose: the function owns the row shape, we only need a list.
const searchResponseSchema = z.object({
  items: z.array(
    z.object({ id: z.string(), source: sourceSchema, created_at: z.string() }).passthrough(),
  ),
  semantic: z.boolean(),
});
const tagCountsSchema = z.array(
  z.object({ name: z.string(), item_count: z.number() }),
);
export type TagCount = z.infer<typeof tagCountsSchema>[number];

const SCREENSHOT_BUCKET = 'screenshots';
export const SIGNED_URL_TTL_SECONDS = 3600;

/** Ingest answered 429; the caller keeps the input so the user can retry. */
export class RateLimitedError extends Error {
  constructor() {
    super('rate limited');
  }
}

async function postIngest(body: Record<string, unknown>): Promise<void> {
  const session = await api.getSession();
  if (!session) throw new Error('not signed in');
  const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/ingest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new RateLimitedError();
  if (!res.ok) throw new Error(`save failed (${res.status})`);
}

/** The only module that talks to Supabase. Components/hooks call these. */
export const api = {
  // --- Auth ---------------------------------------------------------------
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthChange(callback: (session: Session | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return () => data.subscription.unsubscribe();
  },

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  },

  /** Registers a new account. If email confirmation is off, a session is
   *  returned and the user is signed in immediately. */
  async signUp(
    email: string,
    password: string,
  ): Promise<{ needsConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return { needsConfirmation: data.session === null };
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  // --- Items --------------------------------------------------------------
  async listItems(limit = 50): Promise<Item[]> {
    const { data, error } = await supabase
      .from('items')
      .select(ITEM_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as Item[];
  },

  /** In-app capture (channel #2). Goes through the single ingest endpoint
   *  using the session JWT, so normalize/dedupe/enrich stay server-side. */
  async saveLink(url: string, note: string, channel: Channel = 'manual'): Promise<void> {
    await postIngest({
      url: url.trim() || undefined,
      note: note.trim() || undefined,
      channel,
    });
  },

  /** Screenshot capture: upload to the private bucket with the user session,
   *  then ingest verifies ownership and the object before saving the row. */
  async saveScreenshot(
    image: Blob,
    url: string,
    note: string,
    channel: Channel = 'upload',
  ): Promise<void> {
    const session = await api.getSession();
    if (!session) throw new Error('not signed in');
    const path = `${session.user.id}/${crypto.randomUUID()}.jpg`;
    const bucket = supabase.storage.from(SCREENSHOT_BUCKET);

    const { error } = await bucket.upload(path, image, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) throw error;

    try {
      await postIngest({
        url: url.trim() || undefined,
        note: note.trim() || undefined,
        channel,
        image_path: path,
      });
    } catch (err) {
      // Best effort; the daily sweep collects whatever this misses.
      await bucket.remove([path]).catch(() => undefined);
      throw err;
    }
  },

  /** Row first so the item disappears even if storage is down; a leftover
   *  object is collected by the sweep. */
  async deleteItem(item: Pick<Item, 'id' | 'image_path'>): Promise<void> {
    const { error } = await supabase.from('items').delete().eq('id', item.id);
    if (error) throw error;
    if (item.image_path) {
      try {
        await supabase.storage.from(SCREENSHOT_BUCKET).remove([item.image_path]);
      } catch {
        /* swept later */
      }
    }
  },

  /** One batched request for every visible screenshot. */
  async getSignedImageUrls(paths: string[]): Promise<Record<string, string>> {
    if (paths.length === 0) return {};
    const { data, error } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (error) throw error;
    const urls: Record<string, string> = {};
    for (const entry of data ?? []) {
      if (entry.path && entry.signedUrl) urls[entry.path] = entry.signedUrl;
    }
    return urls;
  },

  /** Hybrid search via the `search` edge function (query embedding stays
   *  server-side). The user JWT is attached by the client. */
  async searchItems(query: string, filters: SearchFilters = EMPTY_FILTERS): Promise<Item[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const { data, error } = await supabase.functions.invoke('search', {
      body: { query: trimmed, filters: toRequestFilters(filters, new Date()) },
    });
    if (error) throw error;
    return searchResponseSchema.parse(data).items as unknown as Item[];
  },

  /** The caller's most used tags, for the search filter chips. */
  async listTopTags(): Promise<TagCount[]> {
    const { data, error } = await supabase.rpc('user_tags');
    if (error) throw error;
    return tagCountsSchema.parse(data ?? []);
  },

  collections: collectionsApi,
  publicCollection: fetchPublicCollection,
  resurface: resurfaceApi,
  itemEdit: itemEditApi,

  // --- API tokens ---------------------------------------------------------
  async listTokens(): Promise<ApiToken[]> {
    const { data, error } = await supabase
      .from('api_tokens')
      .select('id, label, last_used_at, revoked_at, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ApiToken[];
  },

  /** Creates a token, returns the raw value ONCE. Only the hash is stored. */
  async createToken(label: string): Promise<{ token: string; row: ApiToken }> {
    const session = await api.getSession();
    if (!session) throw new Error('not signed in');

    const token = generateApiToken();
    const token_hash = await hashApiToken(token);
    const { data, error } = await supabase
      .from('api_tokens')
      .insert({ user_id: session.user.id, token_hash, label: label.trim() })
      .select('id, label, last_used_at, revoked_at, created_at')
      .single();
    if (error) throw error;
    return { token, row: data as ApiToken };
  },

  async revokeToken(id: string): Promise<void> {
    const { error } = await supabase
      .from('api_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
