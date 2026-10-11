// SSRF-guarded redirect resolver (security rule). Used only to resolve
// Facebook `/share/...` wrappers to the real URL. Follows redirects manually so
// every hop's host can be checked; caps hops, time (5s) and only allows
// http/https. Never reads the response body.

const MAX_HOPS = 5;
const TIMEOUT_MS = 5000;

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '0.0.0.0' || host === '::1' || host === '[::1]') return true;

  // IPv4 private / loopback / link-local / unspecified ranges.
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  }
  return false;
}

function assertAllowed(url: string): URL {
  const u = new URL(url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('only http/https allowed');
  }
  if (isBlockedHost(u.hostname)) throw new Error('blocked host');
  return u;
}

export async function resolveRedirect(input: string): Promise<string> {
  let current = assertAllowed(input).toString();

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
      });
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        const next = assertAllowed(new URL(location, current).toString());
        current = next.toString();
        continue;
      }
      return current;
    } finally {
      clearTimeout(timer);
    }
  }
  return current;
}
