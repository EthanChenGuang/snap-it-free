import type { AntiBlockPreset } from './admin/presets.js';
import { isProxyQuotaFatalError } from './shared/proxy-errors.js';
import type { CrawlResult, RunSubitoCrawlerOptions } from './subito/crawler.js';

export const PROXY_QUOTA_FALLBACK_REASON =
  'Proxy quota exhausted — proxy quota direct fallback to crawl (PROXY-C04)';

export type RunSubitoCrawlerFn = (
  categoryUrls: readonly string[],
  preset: AntiBlockPreset,
  proxyUrlOverride?: string,
  options?: RunSubitoCrawlerOptions,
) => Promise<CrawlResult>;

/** Generalized crawler signature shared by Subito and Vinted (Phase 17). */
export type RunCrawlerFn = (
  categoryUrls: readonly string[],
  preset: AntiBlockPreset,
  proxyUrlOverride?: string,
  options?: RunSubitoCrawlerOptions,
) => Promise<CrawlResult>;

export type ProxyFallbackResult = {
  crawlResult: CrawlResult;
  fallbackDegraded: boolean;
  fallbackReason?: string;
};

function maskProxyHost(proxyUrl: string): string {
  try {
    const u = new URL(proxyUrl);
    return `${u.protocol}//${u.hostname}:****`;
  } catch {
    return '[proxy]';
  }
}

/**
 * Run Subito crawl with proxy; on fatal quota exhaustion retry once without proxy (PROXY-C04).
 */
export async function runSubitoCrawlWithProxyFallback(
  runSubitoCrawler: RunSubitoCrawlerFn,
  urls: readonly string[],
  preset: AntiBlockPreset,
  proxyUrl: string | undefined,
  options: RunSubitoCrawlerOptions,
): Promise<ProxyFallbackResult> {
  return runCrawlWithProxyFallback(runSubitoCrawler, urls, preset, proxyUrl, options);
}

/**
 * Run Vinted crawl with proxy; on fatal quota exhaustion retry once without proxy (D-17-33).
 */
export async function runVintedCrawlWithProxyFallback(
  runVintedCrawler: RunCrawlerFn,
  urls: readonly string[],
  preset: AntiBlockPreset,
  proxyUrl: string | undefined,
  options: RunSubitoCrawlerOptions,
): Promise<ProxyFallbackResult> {
  return runCrawlWithProxyFallback(runVintedCrawler, urls, preset, proxyUrl, options);
}

/**
 * Generic proxy fallback for any crawler returning CrawlResult (Phase 17 —
 * Subito and Vinted share this path).
 */
export async function runCrawlWithProxyFallback(
  runCrawler: RunCrawlerFn,
  urls: readonly string[],
  preset: AntiBlockPreset,
  proxyUrl: string | undefined,
  options: RunSubitoCrawlerOptions,
): Promise<ProxyFallbackResult> {
  try {
    const crawlResult = await runCrawler(urls, preset, proxyUrl, options);
    return { crawlResult, fallbackDegraded: false };
  } catch (error) {
    if (!isProxyQuotaFatalError(error)) {
      throw error;
    }

    console.log(
      JSON.stringify({
        event: 'proxy_quota_fallback',
        reason: error.fatalReason,
        proxy_host_masked: proxyUrl ? maskProxyHost(proxyUrl) : '[none]',
      }),
    );

    const crawlResult = await runCrawler(urls, preset, undefined, options);
    return {
      crawlResult,
      fallbackDegraded: true,
      fallbackReason: PROXY_QUOTA_FALLBACK_REASON,
    };
  }
}
