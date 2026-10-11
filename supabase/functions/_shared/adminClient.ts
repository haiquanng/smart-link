import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

export const env = z
  .object({
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    CRON_SECRET: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-3.5-flash-lite'),
  })
  .parse(Deno.env.toObject());

export const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
