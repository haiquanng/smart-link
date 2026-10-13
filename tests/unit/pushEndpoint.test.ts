import { describe, expect, it } from 'vitest';
import { isPushEndpointAllowed } from '@/lib/pushEndpoint';

describe('isPushEndpointAllowed (SSRF guard for user-supplied endpoints)', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc:def',
    'https://updates.push.services.mozilla.com/wpush/v2/gAAA',
    'https://web.push.apple.com/QGZ3x',
    'https://wns2-par02p.notify.windows.com/w/?token=x',
  ])('allows %s', (url) => {
    expect(isPushEndpointAllowed(url)).toBe(true);
  });

  it.each([
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://169.254.169.254/latest/meta-data',
    'https://localhost/x',
    'https://fcm.googleapis.com.evil.com/x',
    'https://evilfcm.googleapis.com.attacker.net/',
    'not a url',
  ])('rejects %s', (url) => {
    expect(isPushEndpointAllowed(url)).toBe(false);
  });

  it('accepts extra hosts only when given (local tests)', () => {
    expect(isPushEndpointAllowed('http://host.docker.internal:9999/push', ['host.docker.internal'])).toBe(true);
    expect(isPushEndpointAllowed('http://host.docker.internal:9999/push')).toBe(false);
  });
});
