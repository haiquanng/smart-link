// POST /functions/v1/public-collection  { slug }   no user auth (verify_jwt off)
// The only read path for a shared collection (security rule: public data is
// exposed through a dedicated function keyed by an unguessable slug, never by
// opening RLS). Screenshots are returned as 1h signed URLs, and only when the
// owner opted in (business rule 20). Unknown or revoked slugs return 404.
import { z } from 'npm:zod@3';
import { corsHeaders, json } from '../_shared/cors.ts';
import { admin } from '../_shared/adminClient.ts';

const SIGNED_URL_TTL_SECONDS = 3600;

const bodySchema = z.object({ slug: z.string().regex(/^[A-Za-z0-9_-]{24}$/) });

interface PublicItem {
  image_path: string | null;
  [key: string]: unknown;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: 'not found' }, 404);

  const { data, error } = await admin.rpc('public_collection', { p_slug: parsed.data.slug });
  if (error) return json({ error: 'lookup failed' }, 500);
  if (!data) return json({ error: 'not found' }, 404);

  const collection = data as { name: string; items: PublicItem[] };
  const paths = collection.items.flatMap((i) => (i.image_path ? [i.image_path] : []));
  const signed: Record<string, string> = {};
  if (paths.length > 0) {
    const { data: urls } = await admin.storage
      .from('screenshots')
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed[u.path] = u.signedUrl;
  }

  // Never leak the storage path itself, only the signed URL.
  const items = collection.items.map(({ image_path, ...rest }) => ({
    ...rest,
    image_url: image_path ? (signed[image_path] ?? null) : null,
  }));
  return json({ name: collection.name, items }, 200);
});
