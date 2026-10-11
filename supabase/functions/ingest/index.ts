// POST /functions/v1/ingest — the single entry point for every capture channel
// (architecture rule). Authenticates a personal api token, normalizes the URL,
// and inserts the item as `pending`. Enrichment happens later and must never
// block or fail this path.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import { validatePayload } from '../_shared/validate.ts';
import { detectSource, normalizeUrl } from '../_shared/url.ts';
import { bearer, hashApiToken } from '../_shared/token.ts';
import { resolveRedirect } from '../_shared/ssrf.ts';

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

/** Kick off enrichment without blocking or failing the save (rule 1 & 7). */
function triggerEnrich(itemId: string): void {
  const task = fetch(`${SUPABASE_URL}/functions/v1/enrich`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ item_id: itemId }),
  }).catch(() => {
    /* enrich is retryable; a failed trigger must not affect the save */
  });
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(task);
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

  // 2. Validate the payload.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const parsed = validatePayload(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const { url, note, channel } = parsed.data;

  // 3. Normalize the URL (redirect-follow + strip tracking). A failed resolve
  //    falls back to the original and must not block saving.
  let urlNormalized: string | null = null;
  if (url) {
    try {
      urlNormalized = await normalizeUrl(url, resolveRedirect);
    } catch {
      urlNormalized = null;
    }
  }
  const source = detectSource(url ?? null);

  // Record token usage (best effort).
  if (tokenRow) {
    await admin
      .from('api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenRow.id);
  }

  // 4. Dedupe on the normalized URL per user (business rule 5): append the new
  //    note to the existing item rather than creating a second row.
  if (urlNormalized) {
    const { data: existing } = await admin
      .from('items')
      .select('id, note')
      .eq('user_id', userId)
      .eq('url_normalized', urlNormalized)
      .maybeSingle();

    if (existing) {
      if (note) {
        const mergedNote = existing.note ? `${existing.note}\n${note}` : note;
        await admin.from('items').update({ note: mergedNote }).eq('id', existing.id);
      }
      return json({ id: existing.id, status: 'pending', duplicate: true }, 200);
    }
  }

  // 5. Insert as pending.
  const { data: inserted, error: insertError } = await admin
    .from('items')
    .insert({
      user_id: userId,
      url: url ?? null,
      url_normalized: urlNormalized,
      source,
      channel,
      note: note ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  // Handle the dedupe race (unique violation) as a duplicate, not an error.
  if (insertError) {
    if (insertError.code === '23505' && urlNormalized) {
      const { data: existing } = await admin
        .from('items')
        .select('id')
        .eq('user_id', userId)
        .eq('url_normalized', urlNormalized)
        .maybeSingle();
      if (existing) {
        return json({ id: existing.id, status: 'pending', duplicate: true }, 200);
      }
    }
    return json({ error: 'insert failed' }, 500);
  }

  triggerEnrich(inserted.id);
  return json({ id: inserted.id, status: 'pending', duplicate: false }, 201);
});
