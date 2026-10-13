import { admin, env } from '../_shared/adminClient.ts';
import { embedText } from '../_shared/gemini.ts';
import { embeddingText } from '../_shared/geminiParse.ts';

/**
 * Recompute only the embedding from the item's current fields, after the
 * user edited it. Title, summary and tags are left alone, so AI fields the
 * user removed do not come back. Without a Gemini key it is a no-op.
 */
export async function embedOnly(itemId: string): Promise<'done' | 'skipped' | 'not_found'> {
  const { data: item, error } = await admin
    .from('items')
    .select('id, note, title, summary, content_text')
    .eq('id', itemId)
    .maybeSingle();
  if (error) throw new Error('lookup failed');
  if (!item) return 'not_found';
  if (!env.GEMINI_API_KEY) return 'skipped';

  const vector = await embedText(
    { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL },
    embeddingText({
      title: item.title,
      note: item.note,
      summary: item.summary,
      ocr: item.content_text,
    }),
  );
  const { error: updateError } = await admin
    .from('items')
    .update({ embedding: JSON.stringify(vector) })
    .eq('id', item.id);
  if (updateError) throw new Error('update failed');
  return 'done';
}
