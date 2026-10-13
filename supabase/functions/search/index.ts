// POST /functions/v1/search  { query, filters? }   auth: user JWT (verify_jwt)
// Embeds the query (Gemini key stays here), then calls search_items as the
// caller so RLS applies. Embedding trouble only downgrades to full text
// (business rule 12). Never log the query.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { corsHeaders, json } from '../_shared/cors.ts';
import { embedText } from '../_shared/gemini.ts';
import { queryEmbeddingText } from '../_shared/geminiParse.ts';
import { searchBodySchema } from '../_shared/searchBody.ts';
import { enforceLimits, SEARCH_LIMITS } from '../_shared/rateLimit.ts';

const EMBED_TIMEOUT_MS = 2500;
const MAX_RESULTS = 50;

const env = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-3.5-flash-lite'),
  })
  .parse(Deno.env.toObject());

async function embedQuery(query: string): Promise<number[] | null> {
  if (!env.GEMINI_API_KEY) return null;
  try {
    return await embedText(
      { apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL },
      queryEmbeddingText(query),
      EMBED_TIMEOUT_MS,
    );
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authorization = req.headers.get('authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const parsed = searchBodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: 'invalid body' }, 400);
  const { query, filters } = parsed.data;

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Counted as the caller (auth.uid()), before spending a Gemini call.
  const limited = await enforceLimits(client, SEARCH_LIMITS);
  if (limited) return limited;

  const embedding = await embedQuery(query);
  const { data, error } = await client.rpc('search_items', {
    query,
    // pgvector accepts its text form through PostgREST.
    query_embedding: embedding ? JSON.stringify(embedding) : null,
    filters: filters ?? {},
    max_results: MAX_RESULTS,
  });
  if (error) return json({ error: 'search failed' }, 500);

  // Vectors and tsvectors are large and useless to the browser.
  const items = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const copy = { ...row };
    delete copy.embedding;
    delete copy.fts;
    return copy;
  });
  return json({ items, semantic: embedding !== null }, 200);
});
