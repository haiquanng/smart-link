// "Already saved?" is answered on the device: the extension keeps the user's
// saved URLs locally and compares tab URLs against them, so browsing history
// is never sent to the server. Pure helpers, unit-tested in savedIndex.test.ts.
import { normalizeUrlSync } from '@/lib/url';

export interface SavedRow {
  url: string | null;
  url_normalized: string | null;
}

function key(url: string): string | null {
  try {
    if (!/^https?:\/\//i.test(url)) return null;
    return normalizeUrlSync(url);
  } catch {
    return null;
  }
}

/** Both the URL as shared (e.g. a Facebook /share/ link) and what enrich resolved it to. */
export function savedKeys(rows: SavedRow[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const value of [row.url, row.url_normalized]) {
      const k = value ? key(value) : null;
      if (k) keys.add(k);
    }
  }
  return [...keys];
}

export function isSaved(url: string, keys: ReadonlySet<string>): boolean {
  const k = key(url);
  return k !== null && keys.has(k);
}
