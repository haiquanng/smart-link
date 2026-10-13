// POST /functions/v1/ingest — the single entry point for every capture channel
// (architecture rule). Authenticates, normalizes the URL without any network
// call, and inserts the item as `pending` (see saveItem.ts). Redirect
// resolution (Facebook /share/ links) and enrichment run afterwards in
// `enrich`, so saving is fast.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import { imagePathOwnedBy, validatePayload } from '../_shared/validate.ts';
import { saveItem } from './saveItem.ts';
import { bearer, hashApiToken } from '../_shared/token.ts';
import { enforceLimits, INGEST_LIMITS } from '../_shared/rateLimit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Service-role client: the edge function authenticates via api_tokens itself,
// then writes rows with an explicit user_id. RLS stays on for all other access.
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Supabase edge runtime: lets background work outlive the response.
declare const EdgeRuntime:
  | { waitUntil(promise: Promise<unknown>): void }
  | undefined;

function background(task: PromiseLike<unknown>): void {
  const p = Promise.resolve(task).catch(() => undefined);
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(p);
}

/** Kick off enrichment without blocking or failing the save (rule 1 & 7). */
function triggerEnrich(itemId: string): void {
  const task = fetch(`${SUPABASE_URL}/functions/v1/enrich`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ item_id: itemId }),
  });
  // enrich is retryable; a failed trigger must not affect the save.
  background(task);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  // 1. Authenticate: Shortcut sends a personal api token, the in-app form sends
  //    the user's session JWT. Both land in the same save path.
  const token = bearer(req.headers.get('authorization'));
  if (!token) return json({ error: 'missing token' }, 401);

  const tokenHash = await hashApiToken(token);
  const { data: tokenRow, error: tokenError } = await admin
    .from('api_tokens')
    .select('id, user_id, revoked_at')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .maybeSingle();

  if (tokenError) return json({ error: 'auth lookup failed' }, 500);

  let userId: string;
  if (tokenRow) {
    userId = tokenRow.user_id as string;
  } else {
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) return json({ error: 'invalid token' }, 401);
    userId = userData.user.id;
  }

  // Per user, so all of a user's tokens and their session share one budget.
  const limited = await enforceLimits(admin, INGEST_LIMITS, userId);
  if (limited) return limited;

  // 2. Validate the payload.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const parsed = validatePayload(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { url, note, channel, image_path: imagePath } = parsed.data;

  // 3. A screenshot must live in the caller's own folder and actually exist;
  //    otherwise a user could attach someone else's object or a dangling path.
  if (imagePath) {
    if (!imagePathOwnedBy(imagePath, userId)) {
      return json({ error: 'forbidden image' }, 403);
    }
    const { data: exists } = await admin.storage
      .from('screenshots')
      .exists(imagePath);
    if (!exists) return json({ error: 'image not found' }, 400);
  }

  // Record token usage (best effort, off the response path).
  if (tokenRow) {
    background(
      admin
        .from('api_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', tokenRow.id),
    );
  }

  const result = await saveItem(
    admin,
    { userId, url, note, channel, imagePath },
    triggerEnrich,
  );
  return json(result.body, result.status);
});
