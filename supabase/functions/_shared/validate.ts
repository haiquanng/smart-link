// Deno mirror of the rules in src/lib/ingestPayload.ts (authoritative, tested
// there). Dependency-free so the edge function needs no npm resolution.

const CHANNELS = [
  'shortcut',
  'paste',
  'upload',
  'share_target',
  'extension',
  'manual',
] as const;

export type Channel = (typeof CHANNELS)[number];

export interface IngestPayload {
  url?: string;
  note?: string;
  channel: Channel;
}

export type ValidationResult =
  | { ok: true; data: IngestPayload }
  | { ok: false; error: string };

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Business rule 2: at least one of url or note (image handled separately). */
export function validatePayload(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, error: 'body must be a json object' };
  }
  const body = input as Record<string, unknown>;

  const url = clean(body.url);
  const note = clean(body.note);

  if (url !== undefined && !/^https?:\/\//i.test(url)) {
    return { ok: false, error: 'url must be http(s)' };
  }
  if (url === undefined && note === undefined) {
    return { ok: false, error: 'at least one of url or note is required' };
  }

  let channel: Channel = 'shortcut';
  if (body.channel !== undefined) {
    if (!CHANNELS.includes(body.channel as Channel)) {
      return { ok: false, error: 'unknown channel' };
    }
    channel = body.channel as Channel;
  }

  return { ok: true, data: { url, note, channel } };
}
