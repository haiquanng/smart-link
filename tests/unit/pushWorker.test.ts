// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

// Runs public/push-sw.js in a fake service worker scope and fires its events.
function loadWorker() {
  const listeners: Record<string, (e: unknown) => void> = {};
  const client = { focus: vi.fn(async () => undefined), navigate: vi.fn(async () => undefined) };
  const self = {
    location: { origin: 'https://smartlink.app' },
    addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] = fn),
    registration: { showNotification: vi.fn(async () => undefined) },
    clients: { matchAll: vi.fn(async () => [client]), openWindow: vi.fn(async () => undefined) },
  };
  runInNewContext(readFileSync('public/push-sw.js', 'utf8'), { self, URL });
  const fire = async (type: string, event: Record<string, unknown>) => {
    let pending: Promise<unknown> = Promise.resolve();
    listeners[type]({ ...event, waitUntil: (p: Promise<unknown>) => (pending = p) });
    await pending;
  };
  return { self, client, fire };
}

describe('push service worker', () => {
  it('shows the reminder from the payload', async () => {
    const { self, fire } = loadWorker();
    await fire('push', { data: { json: () => ({ title: 'Smart Link', body: 'Có 2 link cũ', url: '/resurface' }) } });
    expect(self.registration.showNotification).toHaveBeenCalledWith(
      'Smart Link',
      expect.objectContaining({ body: 'Có 2 link cũ', data: { url: '/resurface' }, tag: 'resurface' }),
    );
  });

  it('falls back to defaults for a malformed payload', async () => {
    const { self, fire } = loadWorker();
    await fire('push', { data: { json: () => { throw new Error('bad'); } } });
    expect(self.registration.showNotification).toHaveBeenCalledWith(
      'Smart Link',
      expect.objectContaining({ data: { url: '/resurface' } }),
    );
  });

  it('opens Resurface in the existing window on tap', async () => {
    const { client, fire } = loadWorker();
    const close = vi.fn();
    await fire('notificationclick', { notification: { close, data: { url: '/resurface' } } });
    expect(close).toHaveBeenCalled();
    expect(client.navigate).toHaveBeenCalledWith('https://smartlink.app/resurface');
    expect(client.focus).toHaveBeenCalled();
  });

  it('never leaves the app for an absolute URL in the payload', async () => {
    const { client, fire } = loadWorker();
    await fire('notificationclick', { notification: { close: vi.fn(), data: { url: 'https://evil.example/x' } } });
    expect(client.navigate).toHaveBeenCalledWith('https://smartlink.app/resurface');
  });
});
