/** Legacy HS256 service_role JWT (`eyJ...`) — required for PostgREST RPC until sb_secret keys verify ES256. */
export function isLegacyServiceRoleJwt(key: string): boolean {
  return key.startsWith('eyJ');
}

/** New Dashboard secret API key — works for Auth admin; PostgREST RPC may reject until signing migration completes. */
export function isNewSecretApiKey(key: string): boolean {
  return key.startsWith('sb_secret_');
}

/**
 * Resolve the key passed to createClient for server-side PostgREST / RPC / storage admin.
 *
 * When SUPABASE_SERVICE_ROLE_KEY is `sb_secret_*`, PostgREST returns misleading
 * "JWT issued at future" (ES256/HS256 signing mismatch). Prefer a legacy JWT from
 * SUPABASE_SERVICE_ROLE_JWT or SCRAPER_ADMIN_SERVICE_ROLE_KEY when present.
 *
 * See docs/ops/supabase-jwt-signing-runbook.md
 */
export function resolveServiceRoleKey(): string {
  const primary = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const legacyJwt = process.env.SUPABASE_SERVICE_ROLE_JWT?.trim();
  const adminFallback = process.env.SCRAPER_ADMIN_SERVICE_ROLE_KEY?.trim();

  if (primary && isLegacyServiceRoleJwt(primary)) {
    return primary;
  }

  if (legacyJwt && isLegacyServiceRoleJwt(legacyJwt)) {
    return legacyJwt;
  }

  if (adminFallback && isLegacyServiceRoleJwt(adminFallback)) {
    return adminFallback;
  }

  if (primary) {
    return primary;
  }

  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY (set SUPABASE_SERVICE_ROLE_JWT to legacy eyJ JWT when using sb_secret_ keys)',
  );
}
