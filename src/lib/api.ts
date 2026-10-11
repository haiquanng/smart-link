import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { generateApiToken, hashApiToken } from '@/lib/apiToken';
import type { ApiToken, Item } from '@/types/item';

const ITEM_COLUMNS =
  'id, url, url_normalized, source, channel, note, title, summary, content_text, image_path, preview_image_url, status, seen_at, created_at';

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

  async signInWithEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
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

  async searchItems(query: string, limit = 50): Promise<Item[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const { data, error } = await supabase.rpc('search_items', {
      query: trimmed,
      filters: {},
      max_results: limit,
    });
    if (error) throw error;
    return (data ?? []) as Item[];
  },

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
