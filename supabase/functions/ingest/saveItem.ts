// Core save logic shared by every capture channel (architecture rule): dedupe
// on the normalized URL, insert as `pending`, hand off to enrich. Never waits
// on enrichment.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { dedupeAction } from '../_shared/dedupe.ts';
import { detectSource, normalizeUrlSync } from '../_shared/url.ts';
import type { Channel } from '../_shared/validate.ts';

export interface SaveInput {
  userId: string;
  url?: string;
  note?: string;
  channel: Channel;
  imagePath?: string;
}

export interface SaveResult {
  status: 200 | 201 | 500;
  body: { id?: string; status?: 'pending'; duplicate?: boolean; error?: string };
}

const duplicate = (id: string): SaveResult => ({
  status: 200,
  body: { id, status: 'pending', duplicate: true },
});

function mergeNotes(existing: string | null, incoming?: string): string | null {
  if (!incoming) return existing;
  return existing ? `${existing}\n${incoming}` : incoming;
}

export async function saveItem(
  admin: SupabaseClient,
  input: SaveInput,
  triggerEnrich: (itemId: string) => void,
): Promise<SaveResult> {
  const { userId, url, note, channel, imagePath } = input;

  let urlNormalized: string | null = null;
  if (url) {
    try {
      urlNormalized = normalizeUrlSync(url);
    } catch {
      urlNormalized = null;
    }
  }
  const source = imagePath && !url ? 'screenshot' : detectSource(url ?? null);

  if (urlNormalized) {
    const { data: existing } = await admin
      .from('items')
      .select('id, note, image_path')
      .eq('user_id', userId)
      .eq('url_normalized', urlNormalized)
      .maybeSingle();

    if (existing) {
      const action = dedupeAction(!!imagePath, !!existing.image_path);
      if (action === 'append_note') {
        if (note) {
          await admin
            .from('items')
            .update({ note: mergeNotes(existing.note, note) })
            .eq('id', existing.id);
        }
        return duplicate(existing.id);
      }
      if (action === 'attach_image') {
        // `is null` guards a concurrent attach; the loser falls through.
        const { data: attached } = await admin
          .from('items')
          .update({
            image_path: imagePath,
            note: mergeNotes(existing.note, note),
            status: 'pending',
          })
          .eq('id', existing.id)
          .is('image_path', null)
          .select('id');
        if (attached && attached.length > 0) {
          triggerEnrich(existing.id);
          return duplicate(existing.id);
        }
      }
      // separate: keep the url but leave it out of the dedupe index.
      urlNormalized = null;
    }
  }

  const insert = (normalized: string | null) =>
    admin
      .from('items')
      .insert({
        user_id: userId,
        url: url ?? null,
        url_normalized: normalized,
        source,
        channel,
        note: note ?? null,
        image_path: imagePath ?? null,
        status: 'pending',
      })
      .select('id')
      .single();

  let { data: inserted, error } = await insert(urlNormalized);

  // Unique violation = lost a dedupe race. A screenshot is never merged away.
  if (error?.code === '23505') {
    if (imagePath) {
      ({ data: inserted, error } = await insert(null));
    } else if (urlNormalized) {
      const { data: existing } = await admin
        .from('items')
        .select('id')
        .eq('user_id', userId)
        .eq('url_normalized', urlNormalized)
        .maybeSingle();
      if (existing) return duplicate(existing.id);
    }
  }
  if (error || !inserted) {
    return { status: 500, body: { error: 'insert failed' } };
  }

  triggerEnrich(inserted.id);
  return {
    status: 201,
    body: { id: inserted.id, status: 'pending', duplicate: false },
  };
}
