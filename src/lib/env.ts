import { z } from 'zod';

const schema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  // Public half of the VAPID pair; without it the reminder toggle is hidden.
  VITE_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
});

/** Validated frontend env. Only VITE_* (anon-safe) values ever reach here. */
export const env = schema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY || undefined,
});
