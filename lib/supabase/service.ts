import { createClient } from '@supabase/supabase-js';
import { requireSupabaseEnv } from './env';
import { resolveServiceRoleKey } from './service-role-key';

/** Server-only service role client for cron fan-out (bypasses RLS). Never import from client components. */
export function createServiceClient() {
  const { url } = requireSupabaseEnv();
  const serviceRoleKey = resolveServiceRoleKey();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
