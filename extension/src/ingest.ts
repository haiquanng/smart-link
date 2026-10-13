// Pure helpers for the extension (unit-tested in ingest.test.ts).

export type Outcome = 'saved' | 'duplicate' | 'signed-out' | 'rate-limited' | 'error';

export interface IngestBody {
  url: string;
  note?: string;
  channel: 'extension';
  image_path?: string;
}

/** Same contract as every other channel: one ingest endpoint (architecture rule). */
export function ingestBody(url: string, note: string, imagePath?: string): IngestBody {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('only http(s) pages can be saved');
  }
  const body: IngestBody = { url, channel: 'extension' };
  const trimmed = note.trim();
  if (trimmed) body.note = trimmed;
  if (imagePath) body.image_path = imagePath;
  return body;
}

export function ingestOutcome(status: number, body: unknown): Outcome {
  if (status === 401) return 'signed-out';
  if (status === 429) return 'rate-limited';
  if (status === 200 || status === 201) {
    const duplicate = typeof body === 'object' && body !== null && (body as { duplicate?: unknown }).duplicate === true;
    return duplicate ? 'duplicate' : 'saved';
  }
  return 'error';
}

/** Object name in the private `screenshots` bucket; ingest only accepts this shape. */
export function screenshotPath(userId: string, id: string): string {
  return `${userId}/${id}.jpg`;
}

// These sites block reading the page, so a screenshot is the only searchable
// content (business rule 10); elsewhere the scraped title is usually enough.
const CAPTURE_HOSTS = ['facebook.com', 'instagram.com', 'threads.net', 'threads.com'];

export function captureByDefault(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return CAPTURE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
