import { createClient } from '@supabase/supabase-js';
import { requireSupabaseEnv } from './env';

/** Server-only service role client for cron fan-out (bypasses RLS). Never import from client components. */
export function createServiceClient() {
  const { url } = requireSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
