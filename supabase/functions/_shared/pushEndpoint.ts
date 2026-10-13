// Deno mirror of src/lib/pushEndpoint.ts (authoritative, unit-tested there).

// Browser push services. The endpoint comes from the browser but is stored by
// the user, so the sender only ever posts to these (security rule: SSRF).
const PUSH_HOST_SUFFIXES = [
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
];

/** `extraHosts` (exact, http allowed) exists only for local tests. */
export function isPushEndpointAllowed(endpoint: string, extraHosts: string[] = []): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (extraHosts.includes(url.hostname)) return true;
  if (url.protocol !== 'https:') return false;
  return PUSH_HOST_SUFFIXES.some((s) => url.hostname === s || url.hostname.endsWith(`.${s}`));
}
