import { ingestBody, ingestOutcome, type Outcome } from './ingest';

declare const __INGEST_URL__: string;
const TOKEN_KEY = 'apiToken';

export async function getToken(): Promise<string | null> {
  const stored = await chrome.storage.local.get(TOKEN_KEY);
  const value = stored[TOKEN_KEY];
  return typeof value === 'string' && value ? value : null;
}

export async function setToken(token: string | null): Promise<void> {
  if (token) await chrome.storage.local.set({ [TOKEN_KEY]: token.trim() });
  else await chrome.storage.local.remove(TOKEN_KEY);
}

/** Posts to the single ingest endpoint with the personal api token. Never logs the token. */
export async function save(url: string, note: string): Promise<Outcome> {
  const token = await getToken();
  if (!token) return 'bad-token';
  try {
    const res = await fetch(__INGEST_URL__, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(ingestBody(url, note)),
    });
    return ingestOutcome(res.status, await res.json().catch(() => null));
  } catch {
    return 'error';
  }
}
