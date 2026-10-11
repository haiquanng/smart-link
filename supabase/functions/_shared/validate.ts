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
  image_path?: string;
}

export type ValidationResult =
  | { ok: true; data: IngestPayload }
  | { ok: false; error: string };

const IMAGE_PATH_PATTERN =
  /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Ingest only trusts an image the caller's own folder holds. */
export function imagePathOwnedBy(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/`);
}

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Business rule 2: at least one of url, note, or image_path. */
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

  let imagePath: string | undefined;
  if (body.image_path !== undefined) {
    if (
      typeof body.image_path !== 'string' ||
      !IMAGE_PATH_PATTERN.test(body.image_path)
    ) {
      return { ok: false, error: 'invalid image_path' };
    }
    imagePath = body.image_path;
  }

  if (url === undefined && note === undefined && imagePath === undefined) {
    return {
      ok: false,
      error: 'at least one of url, note or image_path is required',
    };
  }

  let channel: Channel = 'shortcut';
  if (body.channel !== undefined) {
    if (!CHANNELS.includes(body.channel as Channel)) {
      return { ok: false, error: 'unknown channel' };
    }
    channel = body.channel as Channel;
  }

  return { ok: true, data: { url, note, channel, image_path: imagePath } };
}
