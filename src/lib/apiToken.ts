/**
 * Personal ingest tokens (security rule): 32 random bytes, shown once, stored
 * only as a SHA-256 hash. Uses Web Crypto so the same code runs in the browser
 * (Settings generates a token) and in Deno (the edge function hashes the
 * presented token to look it up). Never log or persist the raw token.
 */

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A new raw token. Return it to the user once; store only its hash. */
export function generateApiToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** Lowercase hex SHA-256 of the token, the value stored in api_tokens.token_hash. */
export async function hashApiToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
