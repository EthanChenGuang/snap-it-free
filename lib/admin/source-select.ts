import type { SupabaseClient } from '@supabase/supabase-js';

export const SOURCE_BASE_FIELDS =
  'slug, display_name, implementation_status, enabled, interval_minutes, anti_block_preset, target_urls';

export const SOURCE_FIELDS_WITH_SESSION = `${SOURCE_BASE_FIELDS}, session_enc`;

export type ScraperSourceRow = {
  slug: string;
  display_name: string;
  implementation_status: string;
  enabled: boolean;
  interval_minutes: number;
  anti_block_preset: string;
  target_urls: string[] | null;
  session_enc?: unknown;
};

type PostgrestLikeError = { code?: string; message?: string } | null;

/** True when PostgREST/Postgres reports session_enc column is absent (migration 030 not applied). */
export function isMissingSessionEncColumn(error: PostgrestLikeError): boolean {
  if (!error) {
    return false;
  }
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    (message.includes('session_enc') &&
      (message.includes('does not exist') || message.includes('could not find')))
  );
}

/**
 * Load a scraper_sources row, falling back when session_enc column is not migrated yet.
 * Dashboard list queries omit session_enc; detail/API must tolerate older schemas.
 */
export async function selectSourceBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<{ row: ScraperSourceRow | null; sessionEncAvailable: boolean }> {
  const withSession = await supabase
    .from('scraper_sources')
    .select(SOURCE_FIELDS_WITH_SESSION)
    .eq('slug', slug)
    .maybeSingle();

  if (!withSession.error && withSession.data) {
    return {
      row: withSession.data as ScraperSourceRow,
      sessionEncAvailable: true,
    };
  }

  if (!isMissingSessionEncColumn(withSession.error)) {
    return { row: null, sessionEncAvailable: false };
  }

  const withoutSession = await supabase
    .from('scraper_sources')
    .select(SOURCE_BASE_FIELDS)
    .eq('slug', slug)
    .maybeSingle();

  if (withoutSession.error || !withoutSession.data) {
    return { row: null, sessionEncAvailable: false };
  }

  return {
    row: { ...(withoutSession.data as ScraperSourceRow), session_enc: null },
    sessionEncAvailable: false,
  };
}
