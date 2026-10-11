import type { Source } from '@/lib/ingestPayload';

/**
 * Exact tracking params to drop, plus any `utm_*` prefix (business rule 4).
 * rdid/share_url are added by Facebook's /share/ redirect and differ per share.
 */
const TRACKING_PARAMS = new Set([
  'mibextid',
  'fbclid',
  'igshid',
  'igsh',
  'si',
  'rdid',
  'share_url',
]);

function isTrackingParam(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.startsWith('utm_') || TRACKING_PARAMS.has(lower);
}

/**
 * Synchronous canonicalization: lowercase host, strip tracking params, drop the
 * fragment and a trailing slash. Pure and total — throws only on an unparseable
 * URL, which callers guard against.
 */
export function stripTrackingParams(input: string): string {
  const u = new URL(input.trim());
  u.hostname = u.hostname.toLowerCase();
  u.protocol = u.protocol.toLowerCase();
  u.hash = '';

  for (const key of [...u.searchParams.keys()]) {
    if (isTrackingParam(key)) u.searchParams.delete(key);
  }

  let out = u.toString();
  // Drop a single trailing slash on non-root paths, and a dangling "?".
  out = out.replace(/\?$/, '');
  if (u.pathname !== '/' && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

export const normalizeUrlSync = stripTrackingParams;

/** Facebook `/share/...` links are redirect wrappers that hide the real URL. */
export function needsRedirectResolution(input: string): boolean {
  try {
    const u = new URL(input);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    return host.endsWith('facebook.com') && u.pathname.startsWith('/share/');
  } catch {
    return false;
  }
}

export interface NormalizeOptions {
  /** Resolves a redirect wrapper to its final URL. Injected so the pure path
   *  stays testable; the edge function passes an SSRF-guarded fetcher. */
  resolveRedirect?: (url: string) => Promise<string>;
}

/**
 * Full normalization (business rule 4): follow a redirect wrapper when present,
 * then canonicalize. A failed resolve must never block saving, so it falls back
 * to the original URL.
 */
export async function normalizeUrl(
  input: string,
  opts: NormalizeOptions = {},
): Promise<string> {
  let current = input.trim();
  if (opts.resolveRedirect && needsRedirectResolution(current)) {
    try {
      current = await opts.resolveRedirect(current);
    } catch {
      current = input.trim();
    }
  }
  return normalizeUrlSync(current);
}

/** Best-effort source classification from the host. */
export function detectSource(url: string): Source {
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
