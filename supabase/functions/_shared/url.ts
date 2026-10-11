// Deno mirror of src/lib/url.ts. Keep in sync — the authoritative logic and its
// unit tests live in src/lib/url.ts (Node/vitest). Duplicated here because the
// edge function runs in Deno and cannot import the `@/`-aliased, zod-importing
// source module.

export type Source =
  | 'facebook'
  | 'instagram'
  | 'threads'
  | 'substack'
  | 'web'
  | 'screenshot'
  | 'other';

const TRACKING_PARAMS = new Set(['mibextid', 'fbclid', 'igshid', 'igsh', 'si']);

function isTrackingParam(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.startsWith('utm_') || TRACKING_PARAMS.has(lower);
}

export function normalizeUrlSync(input: string): string {
  const u = new URL(input.trim());
  u.hostname = u.hostname.toLowerCase();
  u.protocol = u.protocol.toLowerCase();
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) {
    if (isTrackingParam(key)) u.searchParams.delete(key);
  }
  let out = u.toString().replace(/\?$/, '');
  if (u.pathname !== '/' && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

export function needsRedirectResolution(input: string): boolean {
  try {
    const u = new URL(input);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    return host.endsWith('facebook.com') && u.pathname.startsWith('/share/');
  } catch {
    return false;
  }
}

export async function normalizeUrl(
  input: string,
  resolveRedirect?: (url: string) => Promise<string>,
): Promise<string> {
  let current = input.trim();
  if (resolveRedirect && needsRedirectResolution(current)) {
    try {
      current = await resolveRedirect(current);
    } catch {
      current = input.trim();
    }
  }
  return normalizeUrlSync(current);
}

export function detectSource(url: string | null): Source {
  if (!url) return 'other';
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    if (host.endsWith('facebook.com') || host === 'fb.com') return 'facebook';
    if (host.endsWith('instagram.com')) return 'instagram';
    if (host.endsWith('threads.net') || host.endsWith('threads.com'))
      return 'threads';
    if (host.endsWith('substack.com')) return 'substack';
    return 'web';
  } catch {
    return 'other';
  }
}
