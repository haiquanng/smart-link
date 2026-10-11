import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/** The single browser Supabase client. Anon key only; all access is under RLS.
 *  Components never import this directly — they go through src/lib/api.ts. */
export const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
