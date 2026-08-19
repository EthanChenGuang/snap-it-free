import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSupabaseEnv } from '@/lib/supabase/env';

/** Comma-separated operator emails for /admin (scraping admin dashboard) local dev access. */
export function parseScraperAdminOperatorEmails(): string[] {
  const raw =
    process.env.SCRAPER_ADMIN_OPERATOR_EMAILS?.trim() ??
    process.env.OPERATOR_BOOTSTRAP_EMAILS?.trim();
  if (!raw) return [];
  return raw.split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean);
}

export function isScraperAdminOperatorEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return parseScraperAdminOperatorEmails().includes(normalized);
}

/** @deprecated Use parseScraperAdminOperatorEmails */
export const parseBootstrapOperatorEmails = parseScraperAdminOperatorEmails;

/** @deprecated Use isScraperAdminOperatorEmail */
export const isBootstrapOperatorEmail = isScraperAdminOperatorEmail;

function createScraperAdminServiceClient(): SupabaseClient {
  const { url } = requireSupabaseEnv();
  const serviceRoleKey =
    process.env.SCRAPER_ADMIN_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SCRAPER_ADMIN_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY fallback)',
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Dev-only: seed allowlist row for SCRAPER_ADMIN_OPERATOR_EMAILS via service role. */
export async function ensureScraperAdminOperatorInAllowlist(email: string): Promise<boolean> {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }
  if (!isScraperAdminOperatorEmail(email)) {
    return false;
  }

  let service;
  try {
    service = createScraperAdminServiceClient();
  } catch {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  const { data: existing, error: readError } = await service
    .from('operator_allowlist')
    .select('email')
    .eq('email', normalized)
    .maybeSingle();

  if (readError) {
    return false;
  }
  if (existing) {
    return true;
  }

  const { error: insertError } = await service.from('operator_allowlist').insert({ email: normalized });
  return !insertError;
}

/** @deprecated Use ensureScraperAdminOperatorInAllowlist */
export const ensureBootstrapOperatorInAllowlist = ensureScraperAdminOperatorInAllowlist;

/** Session-scoped operator gate for middleware and route handlers. */
export async function hasOperatorAccess(
  supabase: SupabaseClient,
  email: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_operator');
  if (!error && data === true) {
    return true;
  }

  if (process.env.NODE_ENV !== 'development' || !isScraperAdminOperatorEmail(email)) {
    return false;
  }

  const seeded = await ensureScraperAdminOperatorInAllowlist(email);
  if (!seeded) {
    return false;
  }

  const { data: retry, error: retryError } = await supabase.rpc('is_operator');
  return !retryError && retry === true;
}
