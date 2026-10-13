// @vitest-environment node
/**
 * send-reminders against local Supabase with functions served, using a fake
 * push service on this machine. The functions env must include CRON_SECRET,
 * VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and PUSH_EXTRA_HOSTS=host.docker.internal
 * (see development-workflow.md); SMART_LINK_CRON_SECRET must match.
 */
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import { createECDH, randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { localDay, REMINDER_HOUR } from '@/lib/reminderSchedule';

const URL = process.env.SMART_LINK_URL;
const SERVICE_ROLE_KEY = process.env.SMART_LINK_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.SMART_LINK_CRON_SECRET;
const USER_ID = process.env.SMART_LINK_OTHER_USER_ID;

const configured = !!URL && !!SERVICE_ROLE_KEY && !!CRON_SECRET && !!USER_ID;

// A fixed-offset zone where it is currently the reminder hour or later.
function eveningZone(now = new Date()): string {
  for (let off = -12; off <= 14; off++) {
    const zone = off === 0 ? 'UTC' : `Etc/GMT${off > 0 ? '-' : '+'}${Math.abs(off)}`;
    const { hour } = localDay(now, zone);
    if (hour >= REMINDER_HOUR && hour <= 22) return zone;
  }
  throw new Error('no evening zone');
}

function subscriptionKeys() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return { p256dh: ecdh.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') };
}

describe.skipIf(!configured)('send-reminders (integration)', () => {
  let admin: SupabaseClient;
  let server: Server;
  let base: string;
  let received: { path: string; headers: IncomingHttpHeaders }[] = [];
  let respondWith = 201;
  let itemId: string;

  const run = (token = CRON_SECRET as string) =>
    fetch(`${URL}/functions/v1/send-reminders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
  const subscribe = async (endpoint: string, lastSentAt: string | null = null) => {
    const { data, error } = await admin
      .from('push_subscriptions')
      .insert({ user_id: USER_ID, endpoint, time_zone: eveningZone(), last_sent_at: lastSentAt, ...subscriptionKeys() })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  };

  beforeAll(async () => {
    admin = createClient(URL as string, SERVICE_ROLE_KEY as string, { auth: { persistSession: false } });
    server = createServer((req, res) => {
      received.push({ path: req.url ?? '', headers: req.headers });
      req.resume();
      res.writeHead(respondWith).end();
    });
    await new Promise<void>((r) => server.listen(0, '0.0.0.0', r));
    base = `http://host.docker.internal:${(server.address() as AddressInfo).port}`;
    const { data } = await admin
      .from('items')
      .insert({ user_id: USER_ID, note: 'push itest old', source: 'other', channel: 'manual', created_at: '2001-01-01T00:00:00Z' })
      .select('id')
      .single();
    itemId = data?.id as string;
  });

  beforeEach(async () => {
    received = [];
    respondWith = 201;
    await admin.from('push_subscriptions').delete().eq('user_id', USER_ID);
  });

  afterAll(async () => {
    server?.close();
    if (!admin) return;
    await admin.from('push_subscriptions').delete().eq('user_id', USER_ID);
    await admin.from('items').delete().eq('id', itemId);
  });

  it('sends one encrypted, VAPID-signed push and not again the same day', async () => {
    const id = await subscribe(`${base}/push/a`);
    const first = await (await run()).json();
    expect(first).toMatchObject({ sent: 1 });
    expect(received).toHaveLength(1);
    expect(received[0].headers['content-encoding']).toBe('aes128gcm');
    expect(String(received[0].headers.authorization)).toMatch(/^vapid t=.+, k=.+/);
    const { data } = await admin.from('push_subscriptions').select('last_sent_at').eq('id', id).single();
    expect(data?.last_sent_at).not.toBeNull();

    const second = await (await run()).json();
    expect(second).toMatchObject({ sent: 0, due: 0 });
    expect(received).toHaveLength(1);
  });

  it('deletes a subscription the push service says is gone (410)', async () => {
    respondWith = 410;
    const id = await subscribe(`${base}/push/gone`);
    expect(await (await run()).json()).toMatchObject({ removed: 1 });
    const { data } = await admin.from('push_subscriptions').select('id').eq('id', id);
    expect(data).toEqual([]);
  });

  it('never posts to a non push-service endpoint, and drops it', async () => {
    const id = await subscribe('https://169.254.169.254/latest/meta-data');
    expect(await (await run()).json()).toMatchObject({ sent: 0, removed: 1 });
    const { data } = await admin.from('push_subscriptions').select('id').eq('id', id);
    expect(data).toEqual([]);
  });

  it('rejects calls without the cron secret', async () => {
    expect((await run('nope')).status).toBe(403);
  });
});
