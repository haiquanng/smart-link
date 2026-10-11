// Deno mirror of src/lib/aiPatch.ts (authoritative + unit-tested there).
export interface AiResult {
  ocr_text: string;
  title: string;
  summary: string;
  tags: string[];
}

export interface AiPatchInput {
  title: string | null;
  hasImage: boolean;
}

export interface AiPatch {
  title?: string;
  title_origin?: 'ai';
  summary: string;
  content_text?: string;
}

const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 30;

export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const raw of tags) {
    // The model often answers in snake_case (định_giá); tags are plain words.
    const tag = raw
      .replace(/_+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .slice(0, MAX_TAG_LENGTH)
      .trim();
    if (tag) seen.add(tag);
    if (seen.size === MAX_TAGS) break;
  }
  return [...seen];
}

export function planAiPatch(item: AiPatchInput, ai: AiResult): AiPatch {
  const patch: AiPatch = { summary: ai.summary.trim() };
  const title = ai.title.trim();
  if (!item.title?.trim() && title) {
    patch.title = title;
    patch.title_origin = 'ai';
  }
  const ocr = ai.ocr_text.trim();
  if (item.hasImage && ocr) patch.content_text = ocr;
  return patch;
}
