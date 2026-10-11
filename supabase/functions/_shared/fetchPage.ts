import { assertAllowed } from './ssrf.ts';

const TIMEOUT_MS = 5000;
const MAX_BYTES = 1_000_000; // 1 MB cap (security rule)

/**
 * Fetches a user-supplied page's HTML with SSRF and resource guards. Returns
 * null on any problem (blocked host, non-HTML, too big, timeout, error) — a
 * failed fetch must never block or fail enrich.
 */
export async function fetchPageHtml(url: string): Promise<string | null> {
  try {
    assertAllowed(url);
  } catch {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'SmartLinkBot/0.1 (+metadata)' },
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('text/html') || !res.body) return null;

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const size = chunks.reduce((n, c) => n + c.length, 0);
    const buf = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      buf.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder().decode(buf);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
