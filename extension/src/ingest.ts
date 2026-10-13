// Pure helpers for the extension (unit-tested in tests/unit/extensionIngest.test.ts).

export type Outcome = 'saved' | 'duplicate' | 'bad-token' | 'rate-limited' | 'error';

export interface IngestBody {
  url: string;
  note?: string;
  channel: 'extension';
}

/** Same contract as every other channel: one ingest endpoint (architecture rule). */
export function ingestBody(url: string, note: string): IngestBody {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('only http(s) pages can be saved');
  }
  const trimmed = note.trim();
  return trimmed ? { url, note: trimmed, channel: 'extension' } : { url, channel: 'extension' };
}

export function ingestOutcome(status: number, body: unknown): Outcome {
  if (status === 401) return 'bad-token';
  if (status === 429) return 'rate-limited';
  if (status === 200 || status === 201) {
    const duplicate = typeof body === 'object' && body !== null && (body as { duplicate?: unknown }).duplicate === true;
    return duplicate ? 'duplicate' : 'saved';
  }
  return 'error';
}
