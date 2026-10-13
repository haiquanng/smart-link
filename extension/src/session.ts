import { createClient, type Session } from '@supabase/supabase-js';

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

// MV3 service workers have no localStorage; chrome.storage.local lets the
// popup and the background worker share one session.
const chromeStorage = {
  async getItem(key: string): Promise<string | null> {
    const value = (await chrome.storage.local.get(key))[key];
    return typeof value === 'string' ? value : null;
  },
  setItem: (key: string, value: string) => chrome.storage.local.set({ [key]: value }),
  removeItem: (key: string) => chrome.storage.local.remove(key),
};

const AUTH_KEY = 'smart-link-auth';

export const supabase = createClient(__SUPABASE_URL__, __SUPABASE_ANON_KEY__, {
  // The worker sleeps between events, so refresh on use instead of on a timer.
  auth: {
    storage: chromeStorage,
    storageKey: AUTH_KEY,
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/** Signs out on the server when reachable; the local session goes either way. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut().catch(() => undefined);
  await chrome.storage.local.remove(AUTH_KEY);
}

/** Current session (refreshed if the access token expired), or null when signed out. */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
