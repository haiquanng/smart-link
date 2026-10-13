// Per-user rate limits backed by public.hit_rate_limit (fixed windows in
// Postgres). Defaults can be overridden with env vars, see
// development-workflow.md.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { json } from './cors.ts';

export interface Limit {
  bucket: string;
  max: number;
  windowSeconds: number;
}

function envInt(name: string, fallback: number): number {
  const n = Number(Deno.env.get(name));
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export const INGEST_LIMITS: Limit[] = [
  { bucket: 'ingest:min', max: envInt('RATE_LIMIT_INGEST_PER_MIN', 30), windowSeconds: 60 },
  { bucket: 'ingest:day', max: envInt('RATE_LIMIT_INGEST_PER_DAY', 500), windowSeconds: 86400 },
];

export const SEARCH_LIMITS: Limit[] = [
  { bucket: 'search:min', max: envInt('RATE_LIMIT_SEARCH_PER_MIN', 60), windowSeconds: 60 },
];

/**
 * Counts one hit per limit. Returns a 429 response when any is exceeded,
 * otherwise null. A failing check lets the request through: losing a save
 * is worse than missing one count.
 */
export async function enforceLimits(
  client: SupabaseClient,
  limits: Limit[],
  userId?: string,
): Promise<Response | null> {
  let retryAfter = 0;
  for (const limit of limits) {
    const { data, error } = await client.rpc('hit_rate_limit', {
      p_bucket: limit.bucket,
      p_limit: limit.max,
      p_window_seconds: limit.windowSeconds,
      ...(userId ? { p_user: userId } : {}),
    });
    if (error) {
      console.error('rate limit check failed', error.code);
      return null;
    }
    retryAfter = Math.max(retryAfter, Number(data) || 0);
  }
  if (retryAfter === 0) return null;
  const res = json({ error: 'rate limited', retry_after: retryAfter }, 429);
  res.headers.set('Retry-After', String(retryAfter));
  return res;
}
