import { z } from 'zod';
import { env } from '@/lib/env';
import { sourceSchema } from '@/lib/ingestPayload';
import type { Item } from '@/types/item';

const publicItemSchema = z.object({
  id: z.string(),
  url: z.string().nullable(),
  source: sourceSchema,
  title: z.string().nullable(),
  summary: z.string().nullable(),
  note: z.string().nullable(),
  image_url: z.string().nullable(),
  preview_image_url: z.string().nullable(),
  created_at: z.string(),
});
export type PublicItem = z.infer<typeof publicItemSchema>;

const publicCollectionSchema = z.object({
  name: z.string(),
  items: z.array(publicItemSchema),
});
export type PublicCollection = z.infer<typeof publicCollectionSchema>;

export class NotFoundError extends Error {
  constructor() {
    super('not found');
  }
}

export function shareUrl(slug: string, origin: string): string {
  return `${origin}/c/${slug}`;
}

/** Fills the fields a card needs; a public viewer never sees status or channel. */
export function toCardItem(p: PublicItem): Item {
  return {
    id: p.id,
    url: p.url,
    url_normalized: null,
    source: p.source,
    channel: 'manual',
    note: p.note,
    title: p.title,
    summary: p.summary,
    title_origin: null,
    enrich_attempts: 0,
    content_text: null,
    image_path: null,
    preview_image_url: p.preview_image_url,
    status: 'ready',
    seen_at: null,
    created_at: p.created_at,
  };
}

/** Anonymous read through the public-collection function (no session). */
export async function fetchPublicCollection(slug: string): Promise<PublicCollection> {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/public-collection`, {
    method: 'POST',
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  });
  if (res.status === 404) throw new NotFoundError();
  if (!res.ok) throw new Error(`public collection failed (${res.status})`);
  return publicCollectionSchema.parse(await res.json());
}
