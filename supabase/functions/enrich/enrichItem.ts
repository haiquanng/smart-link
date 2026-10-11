import { admin, env } from '../_shared/adminClient.ts';
import { fetchPageHtml } from '../_shared/fetchPage.ts';
import { parseMetadata } from '../_shared/metadata.ts';
import { resolveRedirect } from '../_shared/ssrf.ts';
import { needsRedirectResolution, normalizeUrl } from '../_shared/url.ts';
import { runAiStep, writeAiTags } from './aiStep.ts';
import type { AiStepResult } from './aiStep.ts';
import { mergeIfDuplicate } from './mergeIfDuplicate.ts';

export type EnrichOutcome =
  | { kind: 'not_found' }
  | { kind: 'merged'; id: string }
  | { kind: 'done'; id: string; status: 'ready' | 'enrich_failed' };

/**
 * Enrich one item. Idempotent. Any failure leaves the item saved and
 * searchable by its note (business rule 7); it is marked `enrich_failed` and
 * the retry job picks it up (max 3 attempts).
 */
export async function enrichItem(itemId: string): Promise<EnrichOutcome> {
  const { data: item, error } = await admin
    .from('items')
    .select('id, user_id, url, url_normalized, note, title, title_origin, image_path, enrich_attempts')
    .eq('id', itemId)
    .maybeSingle();
  if (error) throw new Error('lookup failed');
  if (!item) return { kind: 'not_found' };

  const patch: Record<string, unknown> = {
    status: 'ready',
    enrich_attempts: (item.enrich_attempts as number) + 1,
  };
  let ai: AiStepResult | null = null;
  try {
    let fetchUrl: string | null = item.url;
    let description: string | null = null;

    // Ingest skips redirect-following to save fast; resolve Facebook /share/
    // links here so the real post URL is used for dedupe and metadata.
    if (item.url && needsRedirectResolution(item.url)) {
      const resolved = await normalizeUrl(item.url, resolveRedirect);
      // A null url_normalized means ingest kept this screenshot out of the
      // dedupe index; never put it back.
      if (item.url_normalized !== null && resolved !== item.url_normalized) {
        const { mergedInto, separate } = await mergeIfDuplicate(item, resolved);
        if (mergedInto) return { kind: 'merged', id: mergedInto };
        if (!separate) patch.url_normalized = resolved;
      }
      fetchUrl = resolved;
    }

    let title: string | null = item.title;
    if (fetchUrl) {
      const html = await fetchPageHtml(fetchUrl);
      if (html) {
        const meta = parseMetadata(html);
        // Fill an empty title, or replace an AI-made one: a scraped title
        // wins. Never touches the user's note (rule 9).
        if (meta.title && (!item.title || item.title_origin === 'ai')) {
          patch.title = meta.title;
          patch.title_origin = null;
          title = meta.title;
        }
        if (meta.image) patch.preview_image_url = meta.image;
        description = meta.description ?? null;
      }
    }

    // Without a key (local dev) skip AI rather than failing every item.
    if (env.GEMINI_API_KEY) {
      try {
        ai = await runAiStep(
          { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL },
          item,
          title,
          description,
        );
        Object.assign(patch, ai.patch);
      } catch {
        patch.status = 'enrich_failed';
      }
    }
  } catch {
    patch.status = 'enrich_failed';
  }

  const { error: updateError } = await admin.from('items').update(patch).eq('id', item.id);
  // A concurrent save can claim the resolved URL first; keep the item and
  // its share-link URL rather than failing enrichment.
  if (updateError?.code === '23505') {
    delete patch.url_normalized;
    await admin.from('items').update(patch).eq('id', item.id);
  }

  if (ai && patch.status === 'ready') {
    try {
      await writeAiTags(item, ai.tags);
    } catch {
      await admin.from('items').update({ status: 'enrich_failed' }).eq('id', item.id);
      return { kind: 'done', id: item.id, status: 'enrich_failed' };
    }
  }
  return { kind: 'done', id: item.id, status: patch.status as 'ready' | 'enrich_failed' };
}
