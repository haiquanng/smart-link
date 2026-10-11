import { z } from 'zod';
import { sourceSchema } from '@/lib/ingestPayload';

// Authoritative request schema for the `search` edge function; mirrored in
// supabase/functions/_shared/searchBody.ts for Deno. Keep both in sync.
export const MAX_TAG_FILTERS = 10;

export const searchFiltersSchema = z.object({
  sources: z.array(sourceSchema).optional(),
  tags: z.array(z.string().min(1).max(60)).max(MAX_TAG_FILTERS).optional(),
  collection_id: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const searchBodySchema = z.object({
  query: z.string().trim().min(1).max(200),
  filters: searchFiltersSchema.optional(),
});

export type SearchRequestFilters = z.infer<typeof searchFiltersSchema>;
