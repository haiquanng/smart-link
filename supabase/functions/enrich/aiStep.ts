import { encodeBase64 } from 'jsr:@std/encoding@1/base64';
import { admin } from '../_shared/adminClient.ts';
import { normalizeTags, planAiPatch } from '../_shared/aiPatch.ts';
import type { AiPatch } from '../_shared/aiPatch.ts';
import { embedText, generateAi } from '../_shared/gemini.ts';
import type { GeminiConfig } from '../_shared/gemini.ts';
import { embeddingText } from '../_shared/geminiParse.ts';

export interface AiStepItem {
  id: string;
  user_id: string;
  url: string | null;
  note: string | null;
  title: string | null;
  image_path: string | null;
}

export interface AiStepResult {
  patch: AiPatch & { embedding: string };
  tags: string[];
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

async function loadImage(path: string) {
  const { data, error } = await admin.storage.from('screenshots').download(path);
  if (error || !data) throw new Error('image download failed');
  const ext = path.split('.').pop() ?? '';
  const mimeType = MIME_BY_EXT[ext] ?? 'image/jpeg';
  return { mimeType, base64: encodeBase64(new Uint8Array(await data.arrayBuffer())) };
}

/** Generate AI fields, then the embedding. Throws on any failure. */
export async function runAiStep(
  config: GeminiConfig,
  item: AiStepItem,
  title: string | null,
  description: string | null,
): Promise<AiStepResult> {
  const image = item.image_path ? await loadImage(item.image_path) : null;
  const ai = await generateAi(config, {
    note: item.note,
    title,
    url: item.url,
    description,
    image,
  });
  const patch = planAiPatch({ title, hasImage: !!item.image_path }, ai);
  const vector = await embedText(
    config,
    embeddingText({
      title: patch.title ?? title,
      note: item.note,
      summary: patch.summary,
      ocr: patch.content_text ?? null,
    }),
  );
  return { patch: { ...patch, embedding: JSON.stringify(vector) }, tags: normalizeTags(ai.tags) };
}

/** Replace only this item's AI tags; user-origin tags are never touched. */
export async function writeAiTags(item: AiStepItem, tags: string[]): Promise<void> {
  const { error: delError } = await admin
    .from('item_tags')
    .delete()
    .eq('item_id', item.id)
    .eq('origin', 'ai');
  if (delError) throw new Error('tag cleanup failed');
  if (tags.length === 0) return;

  const { error: upsertError } = await admin
    .from('tags')
    .upsert(
      tags.map((name) => ({ user_id: item.user_id, name })),
      { onConflict: 'user_id,name', ignoreDuplicates: true },
    );
  if (upsertError) throw new Error('tag upsert failed');
  const { data: rows, error: selectError } = await admin
    .from('tags')
    .select('id')
    .eq('user_id', item.user_id)
    .in('name', tags);
  if (selectError || !rows) throw new Error('tag lookup failed');

  const { error: linkError } = await admin.from('item_tags').upsert(
    rows.map((r) => ({
      item_id: item.id,
      tag_id: r.id as string,
      user_id: item.user_id,
      origin: 'ai',
    })),
    { onConflict: 'item_id,tag_id', ignoreDuplicates: true },
  );
  if (linkError) throw new Error('tag link failed');
}
