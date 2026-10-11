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
import { dedupeAction } from '../_shared/dedupe.ts';
import { timingSafeEqual } from '../_shared/token.ts';
import { resolveRedirect } from '../_shared/ssrf.ts';
import { needsRedirectResolution, normalizeUrl } from '../_shared/url.ts';

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

interface ItemRow {
  id: string;
  user_id: string;
  note: string | null;
  image_path: string | null;
}

/**
 * Business rule 5: one row per normalized URL per user. If the resolved URL
 * already exists, fold this item into it per dedupeAction. Returns the id it
 * merged into, or null when the item stays (including the `separate` case,
 * where the caller must also leave url_normalized unset).
 */
async function mergeIfDuplicate(
  item: ItemRow,
  resolved: string,
): Promise<{ mergedInto: string | null; separate: boolean }> {
  const { data: existing } = await admin
    .from('items')
    .select('id, note, image_path')
    .eq('user_id', item.user_id)
    .eq('url_normalized', resolved)
    .neq('id', item.id)
    .maybeSingle();
  if (!existing) return { mergedInto: null, separate: false };

  const action = dedupeAction(!!item.image_path, !!existing.image_path);
  if (action === 'separate') return { mergedInto: null, separate: true };

  const merged =
    item.note && existing.note
      ? `${existing.note}\n${item.note}`
      : (item.note ?? existing.note);
  const update: Record<string, unknown> = { note: merged };
  // The storage object moves with the image_path; it is not deleted here.
  if (action === 'attach_image') update.image_path = item.image_path;
  await admin.from('items').update(update).eq('id', existing.id);
  await admin.from('items').delete().eq('id', item.id);
  return { mergedInto: existing.id as string, separate: false };
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
    .select('id, user_id, url, url_normalized, note, title, image_path')
    .eq('id', itemId)
    .maybeSingle();
  if (error) return json({ error: 'lookup failed' }, 500);
  if (!item) return json({ error: 'not found' }, 404);

  try {
    const patch: Record<string, unknown> = { status: 'ready' };
    let fetchUrl = item.url;

    // Ingest skips redirect-following to save fast; resolve Facebook /share/
    // links here so the real post URL is used for dedupe and metadata.
    if (item.url && needsRedirectResolution(item.url)) {
      const resolved = await normalizeUrl(item.url, resolveRedirect);
      // A null url_normalized means ingest kept this screenshot out of the
      // dedupe index; never put it back.
      if (item.url_normalized !== null && resolved !== item.url_normalized) {
        const { mergedInto, separate } = await mergeIfDuplicate(item, resolved);
        if (mergedInto) return json({ id: mergedInto, merged: true }, 200);
        if (!separate) patch.url_normalized = resolved;
      }
      fetchUrl = resolved;
    }

    if (fetchUrl) {
      const html = await fetchPageHtml(fetchUrl);
      if (html) {
        const meta = parseMetadata(html);
        // Only fill empty fields; never overwrite the user's note (rule 9).
        if (meta.title && !item.title) patch.title = meta.title;
        if (meta.image) patch.preview_image_url = meta.image;
      }
    }

    // TODO(phase-3-ai): meta/content -> Gemini summary + tags; screenshot OCR;
    // Google embedding -> patch.summary / item_tags / patch.embedding.

    const { error: updateError } = await admin
      .from('items')
      .update(patch)
      .eq('id', item.id);
    // A concurrent save can claim the resolved URL first; keep the item and
    // its share-link URL rather than failing enrichment.
    if (updateError?.code === '23505') {
      delete patch.url_normalized;
      await admin.from('items').update(patch).eq('id', item.id);
    }
    return json({ id: item.id, status: 'ready' }, 200);
  } catch {
    await admin.from('items').update({ status: 'enrich_failed' }).eq('id', itemId);
    return json({ id: itemId, status: 'enrich_failed' }, 200);
  }
});
