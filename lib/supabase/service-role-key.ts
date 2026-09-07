/**
 * Resolve the key passed to createClient for server-side PostgREST / RPC / storage admin.
 *
 * The two fallbacks let local dev run with only scraper credentials configured; deployed
 * environments always set SUPABASE_SERVICE_ROLE_KEY.
 */
export function resolveServiceRoleKey(): string {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_JWT?.trim() ||
    process.env.SCRAPER_ADMIN_SERVICE_ROLE_KEY?.trim();

  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return key;
}
