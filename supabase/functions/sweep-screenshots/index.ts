// Daily sweep (pg_cron -> pg_net): removes screenshot objects older than 24h
// that no item references (failed ingests, failed object deletes).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { json } from '../_shared/cors.ts';
import { bearer, timingSafeEqual } from '../_shared/token.ts';

const env = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    CRON_SECRET: z.string().min(16),
  })
  .parse(Deno.env.toObject());

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  const token = bearer(req.headers.get('authorization')) ?? '';
  if (!timingSafeEqual(token, env.CRON_SECRET)) {
    return json({ error: 'forbidden' }, 403);
  }

  const { data, error } = await admin.rpc('orphan_screenshots');
  if (error) return json({ error: 'lookup failed' }, 500);
  const names = (data ?? []) as string[];
  if (names.length === 0) return json({ removed: 0 }, 200);

  const { error: removeError } = await admin.storage
    .from('screenshots')
    .remove(names);
  if (removeError) return json({ error: 'remove failed' }, 500);
  return json({ removed: names.length }, 200);
});
