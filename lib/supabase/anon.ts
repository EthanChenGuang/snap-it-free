import { createClient } from '@supabase/supabase-js';
import { requireSupabaseEnv } from './env';

/**
 * Session-free anon Supabase client for public browse data (listings_public).
 * Must not attach the user's JWT — invalid/expired sessions otherwise break the feed
 * while guest (anon) reads still work.
 */
export function createAnonClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
