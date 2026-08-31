import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { requireSupabaseEnv } from '@/lib/supabase/env';
import { createClient as createAuthServerClient } from '@/lib/supabase/server';

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

/** Resolve email from OAuth sessions where top-level user.email can be absent in proxy. */
export function resolveUserEmail(user: User): string | null {
  const direct = user.email?.trim();
  if (direct) return direct;

  const metadataEmail = (user.user_metadata as { email?: unknown } | undefined)?.email;
  if (typeof metadataEmail === 'string' && metadataEmail.trim()) {
    return metadataEmail.trim();
  }

  for (const identity of user.identities ?? []) {
    const identityEmail = identity.identity_data?.email;
    if (typeof identityEmail === 'string' && identityEmail.trim()) {
      return identityEmail.trim();
    }
  }

  return null;
}

/** Service-role client for verified operator server reads/writes (bypasses RLS). */
export function getOperatorServiceClient(): SupabaseClient {
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

async function isEmailOnOperatorAllowlist(email: string): Promise<boolean> {
  let service: SupabaseClient;
  try {
    service = getOperatorServiceClient();
  } catch {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  const { data, error } = await service
    .from('operator_allowlist')
    .select('email')
    .eq('email', normalized)
    .maybeSingle();

  return !error && data != null;
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
    service = getOperatorServiceClient();
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
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    const { data, error } = await supabase.rpc('is_operator');
    return !error && data === true;
  }

  const { data, error } = await supabase.rpc('is_operator');
  if (!error && data === true) {
    return true;
  }

  if (process.env.NODE_ENV === 'development' && isScraperAdminOperatorEmail(normalized)) {
    await ensureScraperAdminOperatorInAllowlist(normalized);
  }

  // Fallback when is_operator RPC is unavailable (OAuth JWT email gap, clock skew, etc.).
  return isEmailOnOperatorAllowlist(normalized);
}

/** Operator gate that resolves email from OAuth user payloads. */
export async function hasOperatorAccessForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<boolean> {
  const email = resolveUserEmail(user);
  if (email) {
    return hasOperatorAccess(supabase, email);
  }

  const { data, error } = await supabase.rpc('is_operator');
  return !error && data === true;
}

/** Verified-operator data client — service role after session gate. */
export async function getOperatorDataClient(): Promise<SupabaseClient | null> {
  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return null;
  }

  const allowed = await hasOperatorAccessForUser(authClient, user);
  if (!allowed) {
    return null;
  }

  try {
    return getOperatorServiceClient();
  } catch {
    return null;
  }
}
