import 'dotenv/config';
import { Configuration } from 'crawlee';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Long-lived workers (Fly) must not persist Crawlee queues to disk — otherwise
// category URLs are deduped as "already handled" and http_requests stays 0.
Configuration.getGlobalConfig().set('persistStorage', false);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const supabaseAdmin: SupabaseClient = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export const SCRAPE_MIN_SELECTOR_RATE = 0.9;
export const SCRAPE_MIN_COUNT_RATIO = Number.parseFloat(process.env.SCRAPE_MIN_COUNT_RATIO ?? '0.5') || 0.5;
/** Minimum share of extracted listings that must resolve non-null coordinates. */
export const SCRAPE_MIN_GEO_RESOLUTION_RATE =
  Number.parseFloat(process.env.SCRAPE_MIN_GEO_RESOLUTION_RATE ?? '0.5') || 0.5;
export const TRAILING_RUN_WINDOW = 7;

export const CRON_ENABLED = process.env.CRON_ENABLED === 'true';

export function getProxyUrl(): string | undefined {
  const url = process.env.PROXY_URL?.trim();
  if (!url) {
    return undefined;
  }
  if (!/^https?:\/\//.test(url)) {
    throw new Error('PROXY_URL must be an http(s) URL');
  }
  return url;
}

/**
 * Resolve proxy for a crawl run.
 * Empty string in options/param means explicit direct crawl (PROXY-C04 fallback).
 */
export function resolveCrawlerProxyUrl(
  optionsOverride?: string,
  paramOverride?: string,
): string | undefined {
  if (optionsOverride !== undefined) {
    const trimmed = optionsOverride.trim();
    return trimmed || undefined;
  }
  if (paramOverride !== undefined) {
    const trimmed = paramOverride.trim();
    return trimmed || undefined;
  }
  return getProxyUrl();
}

export type UseHttpCrawlerMode = 'off' | 'shadow' | 'on';

/**
 * USE_HTTP_CRAWLER rollout flag (D-15-28).
 * unset → on (post-cutover default); off → legacy Playwright-only; shadow → HTTP + compare log.
 */
export function getUseHttpCrawlerMode(): UseHttpCrawlerMode {
  const raw = process.env.USE_HTTP_CRAWLER?.trim().toLowerCase();
  if (raw === 'off') return 'off';
  if (raw === 'shadow') return 'shadow';
  if (raw === 'on') return 'on';
  return 'on';
}

export function isHttpCrawlerEnabled(): boolean {
  return getUseHttpCrawlerMode() !== 'off';
}
