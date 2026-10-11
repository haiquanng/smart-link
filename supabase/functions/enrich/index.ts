// POST /functions/v1/enrich
//   { "item_id": "uuid" }      auth: service role key (ingest, on-demand)
//   { "retry_stuck": true }    auth: CRON_SECRET (pg_cron every 15 min)
// Background enrichment: metadata, then Gemini (summary, tags, OCR, title),
// then embedding, then one update. Failures never lose an item (rule 7).
import { admin, env } from '../_shared/adminClient.ts';
import { corsHeaders, json } from '../_shared/cors.ts';
import { bearer, timingSafeEqual } from '../_shared/token.ts';
import { enrichItem } from './enrichItem.ts';

const MAX_ATTEMPTS = 3;
const RETRY_BATCH = 10;
const PENDING_STALE_MS = 10 * 60 * 1000;

function bodyField(body: unknown, key: string): unknown {
  return typeof body === 'object' && body !== null
    ? (body as Record<string, unknown>)[key]
    : undefined;
}

async function retryStuck(): Promise<Response> {
  const staleBefore = new Date(Date.now() - PENDING_STALE_MS).toISOString();
  const { data, error } = await admin
    .from('items')
    .select('id')
    .lt('enrich_attempts', MAX_ATTEMPTS)
    .or(`status.eq.enrich_failed,and(status.eq.pending,created_at.lt.${staleBefore})`)
    .order('created_at', { ascending: true })
    .limit(RETRY_BATCH);
  if (error) return json({ error: 'lookup failed' }, 500);

  const counts = { processed: 0, ready: 0, failed: 0 };
  // Sequential on purpose: free-tier Gemini rate limits.
  for (const row of data ?? []) {
    counts.processed++;
    try {
      const outcome = await enrichItem(row.id as string);
      if (outcome.kind === 'done' && outcome.status === 'enrich_failed') counts.failed++;
      else counts.ready++;
    } catch {
      counts.failed++;
    }
  }
  return json(counts, 200);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const token = bearer(req.headers.get('authorization')) ?? '';
  const isService = timingSafeEqual(token, env.SUPABASE_SERVICE_ROLE_KEY);
  const isCron =
    !!env.CRON_SECRET && env.CRON_SECRET.length >= 16 && timingSafeEqual(token, env.CRON_SECRET);
  if (!isService && !isCron) return json({ error: 'forbidden' }, 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  if (bodyField(body, 'retry_stuck') === true) return await retryStuck();

  const itemId = bodyField(body, 'item_id');
  if (!isService) return json({ error: 'forbidden' }, 403);
  if (typeof itemId !== 'string') return json({ error: 'item_id required' }, 400);

  try {
    const outcome = await enrichItem(itemId);
    if (outcome.kind === 'not_found') return json({ error: 'not found' }, 404);
    if (outcome.kind === 'merged') return json({ id: outcome.id, merged: true }, 200);
    return json({ id: outcome.id, status: outcome.status }, 200);
  } catch {
    return json({ error: 'lookup failed' }, 500);
  }
});
