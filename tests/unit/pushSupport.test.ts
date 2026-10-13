import { describe, expect, it } from 'vitest';
import { pushAvailability, urlBase64ToUint8Array } from '@/lib/pushSupport';

const ok = { hasPushApi: true, standalone: true, permission: 'default' as const, hasKey: true };

describe('pushAvailability (business rule 17)', () => {
  it('is available in an installed PWA with push support', () => {
    expect(pushAvailability(ok)).toBe('available');
  });
  it('asks to install first when running in a browser tab (iOS needs Home Screen)', () => {
    expect(pushAvailability({ ...ok, standalone: false })).toBe('install-first');
  });
  it('is unsupported without the Push API (iOS < 16.4) or without a server key', () => {
    expect(pushAvailability({ ...ok, hasPushApi: false })).toBe('unsupported');
    expect(pushAvailability({ ...ok, hasKey: false })).toBe('unsupported');
  });
  it('reports a blocked permission', () => {
    expect(pushAvailability({ ...ok, permission: 'denied' })).toBe('blocked');
  });
});

describe('urlBase64ToUint8Array', () => {
  it('decodes a base64url VAPID key', () => {
    expect([...urlBase64ToUint8Array('AQID-_8')]).toEqual([1, 2, 3, 251, 255]);
  });
});
