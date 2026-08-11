import type { SupabaseClient } from '@supabase/supabase-js';
import {
  decryptProxy,
  type EncryptedProxyPayload,
} from '../../lib/admin/crypto.js';
import type { AntiBlockPreset } from './admin/presets.js';
import { getProxyUrl } from './config.js';
import { SUBITO_CATEGORY_URLS } from './subito/categories.js';

export type SourceConfig = {
  urls: string[];
  preset: AntiBlockPreset;
  globalPause: boolean;
  proxyUrl: string | undefined;
  proxyConfigured: boolean;
  enabled: boolean;
  implementationStatus: 'live' | 'coming_soon';
  intervalMinutes: number;
  earlyStopK: number;
  fullRefreshHours: number;
  maxPages: number;
  lastFullRefreshAt: Date | null;
};

/** Merge DB target URLs over env/category fallback when DB is empty (D-18). */
export function mergeTargetUrls(
  dbUrls: string[] | null | undefined,
  fallbackUrls: readonly string[],
): string[] {
  if (dbUrls != null && dbUrls.length > 0) {
    return [...dbUrls];
  }
  return [...fallbackUrls];
}

function resolveProxyUrl(
  proxyEnc: EncryptedProxyPayload | null | undefined,
): string | undefined {
  const secretsKey = process.env.SCRAPER_SECRETS_KEY?.trim();

  if (proxyEnc && secretsKey) {
    try {
      return decryptProxy(proxyEnc, secretsKey);
    } catch {
      console.warn(
        '[config-loader] Failed to decrypt proxy_enc — falling back to PROXY_URL env',
      );
    }
  }

  const envProxy = getProxyUrl();
  if (envProxy) {
    console.log('[config-loader] Using PROXY_URL from environment');
  }
  return envProxy;
}

function fallbackUrlsForSlug(slug: string): readonly string[] {
  if (slug === 'subito') {
    return SUBITO_CATEGORY_URLS;
  }
  return [];
}

/** Load DB-backed source config merged with global settings (D-18). */
export async function loadSourceConfig(
  supabase: SupabaseClient,
  slug: string,
): Promise<SourceConfig | null> {
  const [sourceResult, globalResult] = await Promise.all([
    supabase.from('scraper_sources').select('*').eq('slug', slug).maybeSingle(),
    supabase.from('scraper_global_config').select('*').eq('id', 1).maybeSingle(),
  ]);

  if (sourceResult.error) {
    throw sourceResult.error;
  }
  if (globalResult.error) {
    throw globalResult.error;
  }
  if (!sourceResult.data) {
    return null;
  }

  const source = sourceResult.data;
  const global = globalResult.data;
  const fallback = fallbackUrlsForSlug(slug);
  const dbUrls = source.target_urls as string[] | null | undefined;
  const urls = mergeTargetUrls(dbUrls, fallback);

  if ((dbUrls == null || dbUrls.length === 0) && fallback.length > 0) {
    console.log(
      `[config-loader] Empty DB URLs for ${slug} — falling back to env/category defaults`,
    );
  }

  const proxyUrl = resolveProxyUrl(global?.proxy_enc as EncryptedProxyPayload | null);

  return {
    urls,
    preset: (source.anti_block_preset as AntiBlockPreset) ?? 'standard',
    globalPause: global?.global_pause ?? false,
    proxyUrl,
    proxyConfigured: Boolean(proxyUrl),
    enabled: Boolean(source.enabled),
    implementationStatus: source.implementation_status as 'live' | 'coming_soon',
    intervalMinutes: (source.interval_minutes as number) ?? 90,
    earlyStopK: (global?.early_stop_k as number) ?? 5,
    fullRefreshHours: (global?.full_refresh_hours as number) ?? 24,
    maxPages: (global?.max_pages as number) ?? 1,
    lastFullRefreshAt: global?.last_full_refresh_at
      ? new Date(global.last_full_refresh_at as string)
      : null,
  };
}

/** Load crawl_mode from a pending manual job (SCRP-E03 full crawl trigger). */
export async function loadJobCrawlMode(
  supabase: SupabaseClient,
  jobId: string,
): Promise<'incremental' | 'full' | null> {
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select('crawl_mode')
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const mode = data?.crawl_mode as 'incremental' | 'full' | null | undefined;
  return mode ?? null;
}

/** Record successful full refresh timestamp (D-15-08). */
export async function updateLastFullRefreshAt(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase
    .from('scraper_global_config')
    .update({ last_full_refresh_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) {
    throw error;
  }
}

/** Increment degraded counter and record last block reason for admin (D-15-21). */
export async function recordDegradedRun(
  supabase: SupabaseClient,
  blockReason: string,
): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('scraper_global_config')
    .select('degraded_run_count')
    .eq('id', 1)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const currentCount = (data?.degraded_run_count as number) ?? 0;
  const { error } = await supabase
    .from('scraper_global_config')
    .update({
      degraded_run_count: currentCount + 1,
      last_block_reason: blockReason,
    })
    .eq('id', 1);

  if (error) {
    throw error;
  }
}

/** Advance per-source schedule after a successful cron run (D-13, D-14). */
export async function updateNextRunAt(
  supabase: SupabaseClient,
  slug: string,
  intervalMinutes: number,
): Promise<void> {
  const nextRunAt = new Date(Date.now() + intervalMinutes * 60_000);
  const { error } = await supabase
    .from('scraper_sources')
    .update({ next_run_at: nextRunAt.toISOString() })
    .eq('slug', slug);

  if (error) {
    throw error;
  }
}
