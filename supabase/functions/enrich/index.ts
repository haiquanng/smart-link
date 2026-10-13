// POST /functions/v1/enrich
//   { "item_id": "uuid" }      auth: service role key (ingest, on-demand)
//   { "retry_stuck": true }    auth: CRON_SECRET (pg_cron every 15 min)
//   { "item_id", "mode": "retry" | "embed" }   auth: the owner's session JWT
//     retry = full enrich again (manual retry, ignores the attempt cap);
//     embed = refresh only the embedding after the user edited the item.
// Background enrichment: metadata, then Gemini (summary, tags, OCR, title),
// then embedding, then one update. Failures never lose an item (rule 7).
import { admin, env } from '../_shared/adminClient.ts';
import { corsHeaders, json } from '../_shared/cors.ts';
import { bearer, timingSafeEqual } from '../_shared/token.ts';
import { enrichItem } from './enrichItem.ts';
import { embedOnly } from './embedOnly.ts';
import { enforceLimits, type Limit } from '../_shared/rateLimit.ts';

// Each user call can spend a Gemini request, so keep it tight.
const USER_LIMITS: Limit[] = [{ bucket: 'enrich:min', max: 10, windowSeconds: 60 }];

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

/** A signed-in user asking about one of their own items. */
async function userRequest(token: string, body: unknown): Promise<Response> {
  const { data: userData } = await admin.auth.getUser(token);
  const userId = userData.user?.id;
  if (!userId) return json({ error: 'forbidden' }, 403);

  const itemId = bodyField(body, 'item_id');
  const mode = bodyField(body, 'mode');
  if (typeof itemId !== 'string' || (mode !== 'retry' && mode !== 'embed')) {
    return json({ error: 'item_id and mode required' }, 400);
  }
  const { data: owned } = await admin
    .from('items')
    .select('id')
    .eq('id', itemId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!owned) return json({ error: 'not found' }, 404);

  const limited = await enforceLimits(admin, USER_LIMITS, userId);
  if (limited) return limited;

  try {
    if (mode === 'embed') return json({ id: itemId, embedded: await embedOnly(itemId) }, 200);
    const outcome = await enrichItem(itemId);
    if (outcome.kind === 'not_found') return json({ error: 'not found' }, 404);
    if (outcome.kind === 'merged') return json({ id: outcome.id, merged: true }, 200);
    return json({ id: outcome.id, status: outcome.status }, 200);
  } catch {
    return json({ error: 'enrich failed' }, 500);
  }
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  if (!isService && !isCron) return await userRequest(token, body);

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
