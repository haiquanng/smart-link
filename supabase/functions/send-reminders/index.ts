// POST /functions/v1/send-reminders   auth: CRON_SECRET (pg_cron, hourly)
// Daily Web Push nudge to open Resurface (business rule 17): once per local
// day at REMINDER_HOUR, only for users with something to resurface. Dead
// subscriptions (404/410) are deleted. VAPID private key stays here.
import webpush from 'npm:web-push@3.6.7';
import { z } from 'npm:zod@3';
import { admin, env } from '../_shared/adminClient.ts';
import { corsHeaders, json } from '../_shared/cors.ts';
import { bearer, timingSafeEqual } from '../_shared/token.ts';
import { isReminderDue } from '../_shared/reminderSchedule.ts';
import { isPushEndpointAllowed } from '../_shared/pushEndpoint.ts';

const vapid = z
  .object({
    VAPID_PUBLIC_KEY: z.string().min(1),
    VAPID_PRIVATE_KEY: z.string().min(1),
    VAPID_SUBJECT: z.string().default('mailto:hello@smartlink.app'),
    // Comma-separated exact hosts allowed besides real push services; local tests only.
    PUSH_EXTRA_HOSTS: z.string().default(''),
  })
  .safeParse(Deno.env.toObject());

const BATCH = 500;

interface Subscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  time_zone: string;
  last_sent_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const token = bearer(req.headers.get('authorization')) ?? '';
  const isCron =
    !!env.CRON_SECRET && env.CRON_SECRET.length >= 16 && timingSafeEqual(token, env.CRON_SECRET);
  if (!isCron) return json({ error: 'forbidden' }, 403);
  if (!vapid.success) return json({ error: 'push not configured' }, 503);

  const cfg = vapid.data;
  webpush.setVapidDetails(cfg.VAPID_SUBJECT, cfg.VAPID_PUBLIC_KEY, cfg.VAPID_PRIVATE_KEY);
  const extraHosts = cfg.PUSH_EXTRA_HOSTS.split(',').map((h) => h.trim()).filter(Boolean);

  const { data, error } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth, time_zone, last_sent_at')
    .limit(BATCH);
  if (error) return json({ error: 'lookup failed' }, 500);

  const now = new Date();
  const due = (data as Subscription[]).filter((s) => isReminderDue(now, s.time_zone, s.last_sent_at));
  const users = [...new Set(due.map((s) => s.user_id))];
  const counts = new Map<string, number>();
  if (users.length > 0) {
    const { data: rows, error: countError } = await admin.rpc('resurface_candidates', { p_users: users });
    if (countError) return json({ error: 'count failed' }, 500);
    for (const r of rows as { user_id: string; candidates: number }[]) counts.set(r.user_id, r.candidates);
  }

  const result = { due: due.length, sent: 0, skipped: 0, removed: 0, failed: 0 };
  for (const sub of due) {
    if (!isPushEndpointAllowed(sub.endpoint, extraHosts)) {
      await admin.from('push_subscriptions').delete().eq('id', sub.id);
      result.removed++;
      continue;
    }
    const candidates = counts.get(sub.user_id) ?? 0;
    if (candidates === 0) {
      result.skipped++;
      continue;
    }
    const payload = JSON.stringify({
      title: 'Smart Link',
      body: `Có ${Math.min(candidates, 3)} link cũ đang chờ bạn xem lại.`,
      url: '/resurface',
    });
    // web-push encrypts and signs; fetch sends, so status handling stays here.
    const request = webpush.generateRequestDetails(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      { TTL: 6 * 60 * 60 },
    );
    let status = 0;
    try {
      const res = await fetch(request.endpoint, {
        method: request.method,
        headers: request.headers as Record<string, string>,
        body: request.body as Uint8Array,
        signal: AbortSignal.timeout(5000),
      });
      status = res.status;
      await res.body?.cancel();
    } catch (err) {
      console.error('push failed', (err as Error).name);
    }
    if (status >= 200 && status < 300) {
      await admin.from('push_subscriptions').update({ last_sent_at: now.toISOString() }).eq('id', sub.id);
      result.sent++;
    } else if (status === 404 || status === 410) {
      await admin.from('push_subscriptions').delete().eq('id', sub.id);
      result.removed++;
    } else {
      // No endpoint or keys in logs; they identify the device.
      if (status) console.error('push failed', status);
      result.failed++;
    }
  }
  return json(result, 200);
});
