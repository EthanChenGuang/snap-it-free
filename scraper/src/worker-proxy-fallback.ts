import type { AntiBlockPreset } from './admin/presets.js';
import { findProxyQuotaFatalError } from './shared/proxy-errors.js';
import type { CrawlResult, RunSubitoCrawlerOptions } from './subito/crawler.js';

export const PROXY_QUOTA_FALLBACK_REASON =
  'Proxy quota exhausted — proxy quota direct fallback to crawl (PROXY-C04)';

export const PROXY_CHAIN_FALLBACK_REASON =
  'Primary proxy quota exhausted — failover to next provider in chain';

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

export type ProxyChainFallbackOptions = {
  /** Subito/Vinted: retry direct when all providers in chain are exhausted (PROXY-C04). */
  allowDirectFallback?: boolean;
  /** Wallapop: try next proxy when every URL returns blocked with zero listings. */
  advanceOnAllBlocked?: boolean;
};

function isAllUrlsBlocked(crawlResult: CrawlResult, urlCount: number): boolean {
  return (
    urlCount > 0 &&
    (crawlResult.blockedUrlCount ?? 0) >= urlCount &&
    crawlResult.rawListings.length === 0
  );
}

function maskProxyHost(proxyUrl: string): string {
  try {
    const u = new URL(proxyUrl);
    return `${u.protocol}//${u.hostname}:****`;
  } catch {
    return '[proxy]';
  }
}

function normalizeProxyUrls(
  proxyUrl: string | undefined,
  proxyUrls: string[] | undefined,
): string[] {
  if (proxyUrls && proxyUrls.length > 0) {
    return proxyUrls.filter((url) => url.trim().length > 0);
  }
  if (proxyUrl?.trim()) {
    return [proxyUrl.trim()];
  }
  return [];
}

/**
 * Try proxies in order (DataImpulse → Webshare → Decodo). On quota exhaustion,
 * advance to the next provider before optional direct fallback.
 */
export async function runCrawlWithProxyFallback(
  runCrawler: RunCrawlerFn,
  urls: readonly string[],
  preset: AntiBlockPreset,
  proxyUrl: string | undefined,
  options: RunSubitoCrawlerOptions,
  chainOptions: ProxyChainFallbackOptions = {},
): Promise<ProxyFallbackResult> {
  const proxyList = normalizeProxyUrls(proxyUrl, options.proxyUrls);
  const allowDirectFallback = chainOptions.allowDirectFallback ?? true;

  if (proxyList.length === 0) {
    if (allowDirectFallback) {
      // Explicit '' — do not let resolveCrawlerProxyUrl fall back to PROXY_URL env
      // when the source has use_proxy_url=false (admin direct crawl).
      const directOptions = {
        ...options,
        proxyUrlOverride: options.proxyUrlOverride ?? '',
      };
      const crawlResult = await runCrawler(urls, preset, '', directOptions);
      return { crawlResult, fallbackDegraded: false };
    }
    throw new Error('No proxy configured for crawl');
  }

  let lastQuotaError: ReturnType<typeof findProxyQuotaFatalError> = null;

  for (let index = 0; index < proxyList.length; index += 1) {
    const currentProxy = proxyList[index]!;
    try {
      const crawlResult = await runCrawler(urls, preset, currentProxy, options);
      if (index > 0) {
        console.log(
          JSON.stringify({
            event: 'proxy_chain_failover_success',
            provider_index: index,
            proxy_host_masked: maskProxyHost(currentProxy),
          }),
        );
        return {
          crawlResult,
          fallbackDegraded: true,
          fallbackReason: PROXY_CHAIN_FALLBACK_REASON,
        };
      }
      return { crawlResult, fallbackDegraded: false };
    } catch (error) {
      const quotaError = findProxyQuotaFatalError(error);
      if (!quotaError) {
        throw error;
      }

      lastQuotaError = quotaError;
      const hasNextProvider = index < proxyList.length - 1;
      console.log(
        JSON.stringify({
          event: hasNextProvider ? 'proxy_chain_failover' : 'proxy_quota_exhausted',
          reason: quotaError.fatalReason,
          proxy_host_masked: maskProxyHost(currentProxy),
          next_provider: hasNextProvider,
        }),
      );

      if (hasNextProvider) {
        continue;
      }
    }
  }

  if (!allowDirectFallback) {
    throw lastQuotaError ?? new Error('All proxy providers exhausted');
  }

  const directRunId = options.runId ? `${options.runId}-direct` : undefined;
  console.log('[worker] All proxy providers exhausted — retrying crawl without proxy');

  const crawlResult = await runCrawler(urls, preset, '', {
    ...options,
    proxyUrlOverride: '',
    runId: directRunId,
  });
  return {
    crawlResult,
    fallbackDegraded: true,
    fallbackReason: PROXY_QUOTA_FALLBACK_REASON,
  };
}

/**
 * Run Subito crawl with proxy chain; on chain exhaustion retry once without proxy (PROXY-C04).
 */
export async function runSubitoCrawlWithProxyFallback(
  runSubitoCrawler: RunSubitoCrawlerFn,
  urls: readonly string[],
  preset: AntiBlockPreset,
  proxyUrl: string | undefined,
  options: RunSubitoCrawlerOptions,
): Promise<ProxyFallbackResult> {
  return runCrawlWithProxyFallback(runSubitoCrawler, urls, preset, proxyUrl, options, {
    allowDirectFallback: true,
  });
}

/**
 * Run Vinted crawl with proxy chain; on chain exhaustion retry once without proxy (D-17-33).
 */
export async function runVintedCrawlWithProxyFallback(
  runVintedCrawler: RunCrawlerFn,
  urls: readonly string[],
  preset: AntiBlockPreset,
  proxyUrl: string | undefined,
  options: RunSubitoCrawlerOptions,
): Promise<ProxyFallbackResult> {
  return runCrawlWithProxyFallback(runVintedCrawler, urls, preset, proxyUrl, options, {
    allowDirectFallback: true,
  });
}

/** Wallapop requires proxy — chain only, no direct fallback (D-25-02). */
export async function runWallapopCrawlWithProxyFallback(
  runWallapopCrawler: RunCrawlerFn,
  urls: readonly string[],
  preset: AntiBlockPreset,
  proxyUrl: string | undefined,
  options: RunSubitoCrawlerOptions,
): Promise<ProxyFallbackResult> {
  if (!proxyUrl && !(options.proxyUrls?.length ?? 0)) {
    throw new Error('Wallapop crawl requires residential proxy (D-25-02)');
  }
  return runCrawlWithProxyFallback(runWallapopCrawler, urls, preset, proxyUrl, options, {
    allowDirectFallback: false,
  });
}

/**
 * Run Facebook crawl with proxy chain — no direct-IP fallback (D-18-08/37, SCRP-E05).
 */
export async function runFacebookCrawlWithProxyFallback(
  runFacebookCrawler: RunCrawlerFn,
  urls: readonly string[],
  preset: AntiBlockPreset,
  proxyUrl: string | undefined,
  options: RunSubitoCrawlerOptions,
): Promise<ProxyFallbackResult> {
  if (!proxyUrl && !(options.proxyUrls?.length ?? 0)) {
    throw new Error('Facebook crawl requires residential proxy (D-18-08)');
  }
  return runCrawlWithProxyFallback(runFacebookCrawler, urls, preset, proxyUrl, options, {
    allowDirectFallback: false,
  });
}
