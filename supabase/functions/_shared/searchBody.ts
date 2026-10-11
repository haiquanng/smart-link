// Deno mirror of src/lib/searchBody.ts (authoritative, tested there).
import { z } from 'npm:zod@3';

const SOURCES = [
  'facebook',
  'instagram',
  'threads',
  'substack',
  'web',
  'screenshot',
  'other',
] as const;

export const searchBodySchema = z.object({
  query: z.string().trim().min(1).max(200),
  filters: z
    .object({
      sources: z.array(z.enum(SOURCES)).optional(),
      tags: z.array(z.string().min(1).max(60)).max(10).optional(),
      collection_id: z.string().uuid().optional(),
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
});
