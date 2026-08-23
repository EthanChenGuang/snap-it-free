import type { SupabaseClient } from '@supabase/supabase-js';

const SOURCE_DETAIL_CORE_FIELDS =
  'slug, display_name, implementation_status, enabled, interval_minutes, anti_block_preset, target_urls';

const SOURCE_LIST_CORE_FIELDS =
  'slug, display_name, implementation_status, enabled, interval_minutes, anti_block_preset';

/** Columns added by later migrations — a stale schema must degrade, not blank the admin. */
type OptionalColumn = 'use_proxy_url' | 'session_enc';

/**
 * Progressively drops optional columns so one unapplied migration cannot break every
 * scraper_sources read. Only the first attempt runs against a current schema.
 */
const OPTIONAL_COLUMN_LADDER: OptionalColumn[][] = [
  ['use_proxy_url', 'session_enc'],
  ['session_enc'],
  ['use_proxy_url'],
  [],
];

export type ScraperSourceRow = {
  slug: string;
  display_name: string;
  implementation_status: string;
  enabled: boolean;
  interval_minutes: number;
  anti_block_preset: string;
  target_urls: string[] | null;
  use_proxy_url?: boolean | null;
  session_enc?: unknown;
};

export type SourceSelectResult = {
  row: ScraperSourceRow | null;
  sessionEncAvailable: boolean;
  useProxyUrlAvailable: boolean;
};

export type SourceListSelectResult = {
  rows: ScraperSourceRow[] | null;
  useProxyUrlAvailable: boolean;
};

type PostgrestLikeError = { code?: string; message?: string } | null;

/** Vinted crawls through the shared proxy by default; every other source goes direct. */
export function defaultUseProxyUrl(slug: string): boolean {
  return slug === 'vinted';
}

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

/** True when use_proxy_url is absent (migration 032 not applied). */
export function isMissingUseProxyUrlColumn(error: PostgrestLikeError): boolean {
  if (!error) {
    return false;
  }
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    (message.includes('use_proxy_url') &&
      (message.includes('does not exist') || message.includes('could not find')))
  );
}

function isMissingOptionalColumn(error: PostgrestLikeError): boolean {
  return isMissingSessionEncColumn(error) || isMissingUseProxyUrlColumn(error);
}

function buildSelect(coreFields: string, optional: OptionalColumn[]): string {
  return [coreFields, ...optional].join(', ');
}

/** Normalizes absent optional columns to null so callers can apply their own defaults. */
function withOptionalDefaults(
  row: ScraperSourceRow,
  optional: OptionalColumn[],
): ScraperSourceRow {
  return {
    ...row,
    use_proxy_url: optional.includes('use_proxy_url') ? row.use_proxy_url : null,
    session_enc: optional.includes('session_enc') ? row.session_enc : null,
  };
}

/**
 * Load a scraper_sources row, tolerating schemas where use_proxy_url or session_enc
 * has not been migrated yet.
 */
export async function selectSourceBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<SourceSelectResult> {
  for (const optional of OPTIONAL_COLUMN_LADDER) {
    const { data, error } = await supabase
      .from('scraper_sources')
      .select(buildSelect(SOURCE_DETAIL_CORE_FIELDS, optional))
      .eq('slug', slug)
      .maybeSingle();

    if (!error && data) {
      return {
        row: withOptionalDefaults(data as unknown as ScraperSourceRow, optional),
        sessionEncAvailable: optional.includes('session_enc'),
        useProxyUrlAvailable: optional.includes('use_proxy_url'),
      };
    }

    if (!isMissingOptionalColumn(error)) {
      break;
    }
  }

  return { row: null, sessionEncAvailable: false, useProxyUrlAvailable: false };
}

/**
 * Load the dashboard source list, tolerating a schema where use_proxy_url is not
 * migrated yet. session_enc is never needed here.
 */
export async function selectSourcesForList(
  supabase: SupabaseClient,
): Promise<SourceListSelectResult> {
  for (const optional of [['use_proxy_url'] as OptionalColumn[], [] as OptionalColumn[]]) {
    const { data, error } = await supabase
      .from('scraper_sources')
      .select(buildSelect(SOURCE_LIST_CORE_FIELDS, optional))
      .order('slug');

    if (!error && data) {
      return {
        rows: (data as unknown as ScraperSourceRow[]).map((row) =>
          withOptionalDefaults(row, optional),
        ),
        useProxyUrlAvailable: optional.includes('use_proxy_url'),
      };
    }

    if (!isMissingUseProxyUrlColumn(error)) {
      break;
    }
  }

  return { rows: null, useProxyUrlAvailable: false };
}
