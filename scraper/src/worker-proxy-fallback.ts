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
  try {
    const crawlResult = await runSubitoCrawler(urls, preset, proxyUrl, options);
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

    const crawlResult = await runSubitoCrawler(urls, preset, undefined, options);
    return {
      crawlResult,
      fallbackDegraded: true,
      fallbackReason: PROXY_QUOTA_FALLBACK_REASON,
    };
  }
}
