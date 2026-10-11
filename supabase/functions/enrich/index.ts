// POST /functions/v1/enrich  { "item_id": "uuid" }
// Background enrichment. Idempotent and retryable. Any failure sets the item to
// `enrich_failed` but never deletes or hides it — it stays searchable by note
// (business rule 7). Called fire-and-forget by ingest and re-runnable on demand.
//
// TODO(phase-3-ai): Gemini summary + tags, screenshot OCR, and Google
// embeddings. Tracked in .claude/docs/development-workflow.md. This skeleton
// does metadata fetch only; AI steps plug in where marked below.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import { fetchPageHtml } from '../_shared/fetchPage.ts';
import { parseMetadata } from '../_shared/metadata.ts';
import { timingSafeEqual } from '../_shared/token.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function itemIdOf(body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'item_id' in body) {
    const v = (body as Record<string, unknown>).item_id;
    return typeof v === 'string' ? v : null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  // Internal-only: callers present the service role key.
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!timingSafeEqual(token, SERVICE_ROLE_KEY)) {
    return json({ error: 'forbidden' }, 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const itemId = itemIdOf(body);
  if (!itemId) return json({ error: 'item_id required' }, 400);

  const { data: item, error } = await admin
    .from('items')
    .select('id, url, title')
    .eq('id', itemId)
    .maybeSingle();
  if (error) return json({ error: 'lookup failed' }, 500);
  if (!item) return json({ error: 'not found' }, 404);

  try {
    const patch: Record<string, unknown> = { status: 'ready' };

    if (item.url) {
      const html = await fetchPageHtml(item.url);
      if (html) {
        const meta = parseMetadata(html);
        // Only fill empty fields; never overwrite the user's note (rule 9).
        if (meta.title && !item.title) patch.title = meta.title;
        if (meta.image) patch.preview_image_url = meta.image;
      }
    }

    // TODO(phase-3-ai): meta/content -> Gemini summary + tags; screenshot OCR;
    // Google embedding -> patch.summary / item_tags / patch.embedding.

    await admin.from('items').update(patch).eq('id', item.id);
    return json({ id: item.id, status: 'ready' }, 200);
  } catch {
    await admin.from('items').update({ status: 'enrich_failed' }).eq('id', itemId);
    return json({ id: itemId, status: 'enrich_failed' }, 200);
  }
});
