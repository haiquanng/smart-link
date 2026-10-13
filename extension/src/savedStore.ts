import { savedKeys, type SavedRow } from './savedIndex';
import { getSession, supabase } from './session';

// The user's saved URLs, kept on this device only (see savedIndex.ts).
const KEY = 'savedKeys';
const PAGE = 1000;

export async function loadSaved(): Promise<Set<string>> {
  const value = (await chrome.storage.local.get(KEY))[KEY];
  return new Set(Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);
}

async function store(keys: Iterable<string>): Promise<void> {
  await chrome.storage.local.set({ [KEY]: [...keys] });
}

/** Re-reads the user's links (RLS limits rows to them). Signed out = empty. */
export async function syncSaved(): Promise<void> {
  if (!(await getSession())) return clearSaved();
  const rows: SavedRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('items')
      .select('url, url_normalized')
      .not('url', 'is', null)
      .order('created_at')
      .range(from, from + PAGE - 1);
    if (error) return; // keep the last good list
    rows.push(...(data as SavedRow[]));
    if (data.length < PAGE) break;
  }
  await store(savedKeys(rows));
}

/** Right after a save, so the badge updates without waiting for a sync. */
export async function markSaved(url: string): Promise<void> {
  const keys = await loadSaved();
  for (const k of savedKeys([{ url, url_normalized: null }])) keys.add(k);
  await store(keys);
}

export async function clearSaved(): Promise<void> {
  await chrome.storage.local.remove(KEY);
}

export const SAVED_STORAGE_KEY = KEY;
