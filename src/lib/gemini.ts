import { z } from 'zod';
import type { AiResult } from '@/lib/aiPatch';

// Pure parts of the Gemini integration. Authoritative copy; mirrored in
// supabase/functions/_shared/geminiParse.ts for Deno. Network calls live in
// supabase/functions/_shared/gemini.ts.

export const EMBEDDING_DIMS = 768;
const EMBEDDING_TEXT_MAX = 6000;

const aiResultSchema = z.object({
  ocr_text: z.string(),
  title: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
});

const generateSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({ parts: z.array(z.object({ text: z.string() })) }),
      }),
    )
    .min(1),
});

const embedSchema = z.object({
  embedding: z.object({ values: z.array(z.number()).length(EMBEDDING_DIMS) }),
});

/** Null on any deviation: a bad AI answer is a failure, never partial data. */
export function parseGenerateResponse(body: unknown): AiResult | null {
  const outer = generateSchema.safeParse(body);
  if (!outer.success) return null;
  const text = outer.data.candidates[0].content.parts.map((p) => p.text).join('');
  let inner: unknown;
  try {
    inner = JSON.parse(text);
  } catch {
    return null;
  }
  const result = aiResultSchema.safeParse(inner);
  return result.success ? result.data : null;
}

export function parseEmbedResponse(body: unknown): number[] | null {
  const result = embedSchema.safeParse(body);
  return result.success ? result.data.embedding.values : null;
}

export interface EmbeddingInput {
  title: string | null;
  note: string | null;
  summary: string | null;
  ocr: string | null;
}

/** Document format from the architecture doc; capped to keep requests small. */
export function embeddingText(input: EmbeddingInput): string {
  const head = `title: ${input.title?.trim() || 'none'} | text: ${input.note?.trim() ?? ''}`;
  const parts = [head, input.summary?.trim(), input.ocr?.trim()].filter(
    (p): p is string => !!p,
  );
  return parts.join('\n').slice(0, EMBEDDING_TEXT_MAX);
}
