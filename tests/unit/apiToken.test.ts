import { describe, expect, it } from 'vitest';
import { generateApiToken, hashApiToken } from '@/lib/apiToken';

describe('apiToken', () => {
  it('generates a long, url-safe token', () => {
    const token = generateApiToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 bytes base64url -> 43 chars
    expect(token.length).toBeGreaterThanOrEqual(43);
  });

  it('generates a unique token each time', () => {
    expect(generateApiToken()).not.toBe(generateApiToken());
  });

  it('hashes to a 64-char lowercase hex sha256', async () => {
    const hash = await hashApiToken('hello');
    expect(hash).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('is deterministic', async () => {
    const token = generateApiToken();
    expect(await hashApiToken(token)).toBe(await hashApiToken(token));
  });
});
