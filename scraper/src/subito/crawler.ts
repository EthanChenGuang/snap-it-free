import {
  HttpCrawler,
  PlaywrightCrawler,
  ProxyConfiguration,
  RequestQueue,
} from 'crawlee';
import { getProxyFatalFailure, ProxyQuotaFatalError } from '../shared/proxy-errors.js';
import { presetToCrawleeOptions, type AntiBlockPreset } from '../admin/presets.js';
import {
  getUseHttpCrawlerMode,
  isHttpCrawlerEnabled,
  resolveCrawlerProxyUrl,
  type UseHttpCrawlerMode,
} from '../config.js';
import { applyEarlyStop, type EarlyStopListing } from './early-stop.js';
import {
  dismissCookieBanner,
  extractFromDetailPage,
  extractListingsFromPage,
  isRegaloCategoryUrl,
  type RawListing,
} from './extract.js';
import {
  detailBudgetCap,
  FALLBACK_CONCURRENCY,
  selectDetailCandidates,
  shouldVisitDetail,
} from './fallback-queue.js';
import { CategoryParseError, parseCategoryNextData } from './http-extract.js';

export type CrawlMode = 'incremental' | 'full';

/** In-memory session pool only — avoids SDK_SESSION_POOL_STATE.json after storage purge. */
function sessionPoolOptions(maxPoolSize: number) {
  return {
    maxPoolSize,
    persistenceOptions: { enable: false },
  };
}

export type RunSubitoCrawlerOptions = {
  knownMap?: Map<string, string>;
  earlyStopK?: number;
  isFullRefresh?: boolean;
  proxyUrlOverride?: string;
  /** Ordered provider chain — worker failover uses this before direct fallback. */
  proxyUrls?: string[];
  mode?: CrawlMode;
  /** Isolates Crawlee request queue per scrape run (avoids 0-request dedupe on long-lived workers). */
  runId?: string;
};

export type CategoryUrlStats = {
  url: string;
  listingsFound: number;
  listingsSkippedAtCrawl: number;
  blocked: boolean;
  earlyStopTriggered: boolean;
};

export type CrawlResult = {
  rawListings: RawListing[];
  selectorHitRate: number;
  httpRequests: number;
  listingsSkippedAtCrawl: number;
  jsonFieldCompleteness: number;
  blockedUrlCount: number;
  detailCapDeferred: number;
  crawlMode: CrawlMode;
  urlBreakdown: CategoryUrlStats[];
};

type FallbackRequestKind = 'block-retry' | 'detail';

type FallbackUserData = {
  kind: FallbackRequestKind;
  sourceCategoryUrl?: string;
  listing?: EarlyStopListing;
};

type CategoryProcessResult = {
  workQueue: EarlyStopListing[];
  touchCandidates: EarlyStopListing[];
  listingsSkippedAtCrawl: number;
  jsonFieldCompleteness: number;
  blocked: boolean;
  stoppedEarly: boolean;
};

function initUrlStats(categoryUrls: readonly string[]): Map<string, CategoryUrlStats> {
  const map = new Map<string, CategoryUrlStats>();
  for (const url of categoryUrls) {
    map.set(url, {
      url,
      listingsFound: 0,
      listingsSkippedAtCrawl: 0,
      blocked: false,
      earlyStopTriggered: false,
    });
  }
  return map;
}

function recordCategorySuccess(
  urlStats: Map<string, CategoryUrlStats>,
  categoryUrl: string,
  result: CategoryProcessResult,
): void {
  const stats = urlStats.get(categoryUrl);
  if (!stats) {
    return;
  }
  stats.listingsFound += result.workQueue.length + result.touchCandidates.length;
  stats.listingsSkippedAtCrawl += result.listingsSkippedAtCrawl;
  if (result.stoppedEarly) {
    stats.earlyStopTriggered = true;
  }
}

function recordCategoryBlocked(
  urlStats: Map<string, CategoryUrlStats>,
  categoryUrl: string,
): void {
  const stats = urlStats.get(categoryUrl);
  if (!stats) {
    return;
  }
  stats.blocked = true;
}

function buildUrlBreakdownFromListings(
  categoryUrls: readonly string[],
  rawListings: RawListing[],
  failedUrls: Set<string>,
): CategoryUrlStats[] {
  return categoryUrls.map((url) => {
    const listingsFound = rawListings.filter(
      (listing) => listing.source_category_url === url,
    ).length;
    return {
      url,
      listingsFound,
      listingsSkippedAtCrawl: 0,
      blocked: failedUrls.has(url) || listingsFound === 0,
      earlyStopTriggered: false,
    };
  });
}

function proxyErrorHandler(
  request: { noRetry?: boolean },
  error: unknown,
): void {
  const fatalReason = getProxyFatalFailure(error);
  if (!fatalReason) {
    return;
  }

  request.noRetry = true;
  throw new ProxyQuotaFatalError(fatalReason);
}

function maskProxyHost(proxyUrl: string): string {
  try {
    const u = new URL(proxyUrl);
    return `${u.protocol}//${u.hostname}:****`;
  } catch {
    return '[proxy]';
  }
}

async function openRunRequestQueue(runId?: string): Promise<RequestQueue> {
  const suffix =
    runId?.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36) ?? `${Date.now()}`;
  return RequestQueue.open(`subito-run-${suffix}`);
}

async function dropRunRequestQueue(queue: RequestQueue): Promise<void> {
  try {
    await queue.drop();
  } catch {
    /* best-effort — ephemeral queue cleanup */
  }
}

function toRawListing(entry: EarlyStopListing): RawListing {
  return entry;
}

function ingestCategoryResults(
  result: CategoryProcessResult,
  rawListings: RawListing[],
  detailCandidatePool: EarlyStopListing[],
): number {
  for (const touch of result.touchCandidates) {
    rawListings.push(toRawListing(touch));
  }

  for (const entry of result.workQueue) {
    if (shouldVisitDetail(entry)) {
      detailCandidatePool.push(entry);
    } else {
      rawListings.push(toRawListing(entry));
    }
  }

  return result.workQueue.length + result.listingsSkippedAtCrawl;
}

function processCategoryHtml(
  html: string,
  categoryUrl: string,
  knownMap: Map<string, string>,
  earlyStopK: number,
  isFullRefresh: boolean,
): CategoryProcessResult {
  try {
    const parsed = parseCategoryNextData(html, categoryUrl);
    const early = applyEarlyStop({
      listings: parsed.listings,
      knownMap,
      earlyStopK,
      isFullRefresh,
    });
    return {
      workQueue: early.workQueue,
      touchCandidates: early.touchCandidates,
      listingsSkippedAtCrawl: early.listingsSkippedAtCrawl,
      jsonFieldCompleteness: parsed.jsonFieldCompleteness,
      blocked: false,
      stoppedEarly: early.stoppedEarly,
    };
  } catch (error) {
    if (error instanceof CategoryParseError) {
      return {
        workQueue: [],
        touchCandidates: [],
        listingsSkippedAtCrawl: 0,
        jsonFieldCompleteness: 0,
        blocked: true,
        stoppedEarly: false,
      };
    }
    throw error;
  }
}

function isBlockedHttpResponse(statusCode: number | undefined, html: string): boolean {
  if (statusCode === 403 || statusCode === 429) return true;
  if (/blocked|access denied|captcha/i.test(html.slice(0, 4000))) return true;
  return false;
}

async function runLegacyPlaywrightCrawler(
  categoryUrls: readonly string[],
  preset: AntiBlockPreset,
  proxyUrlOverride?: string,
  runId?: string,
): Promise<Pick<CrawlResult, 'rawListings' | 'selectorHitRate'>> {
  const rawListings: RawListing[] = [];
  let selectorHits = 0;
  let selectorTotal = 0;

  const crawleeOpts = presetToCrawleeOptions(preset);
  const proxyUrl = proxyUrlOverride;
  const proxyConfiguration = proxyUrl
    ? new ProxyConfiguration({ proxyUrls: [proxyUrl] })
    : undefined;

  const requestQueue = await openRunRequestQueue(runId);
  try {
    const crawler = new PlaywrightCrawler({
      requestQueue,
      proxyConfiguration,
      useSessionPool: true,
      persistCookiesPerSession: true,
      sessionPoolOptions: sessionPoolOptions(crawleeOpts.maxPoolSize),
      maxRequestRetries: crawleeOpts.maxRequestRetries,
      minConcurrency: crawleeOpts.minConcurrency,
      launchContext: {
        launchOptions: {
          headless: true,
        },
      },
      async requestHandler({ page, session, request }) {
        const title = await page.title();
        if (title.toLowerCase().includes('blocked')) {
          session?.retire();
          return;
        }

        const { listings, hitRate } = await extractListingsFromPage(page);
        for (const listing of listings) {
          if (!listing.source_category_url && isRegaloCategoryUrl(request.url)) {
            listing.source_category_url = request.url;
          }
        }
        rawListings.push(...listings);
        selectorHits += hitRate.hits;
        selectorTotal += hitRate.total;
      },
    });

    await crawler.run([...categoryUrls]);

    return {
      rawListings,
      selectorHitRate: selectorTotal > 0 ? selectorHits / selectorTotal : 0,
    };
  } finally {
    await dropRunRequestQueue(requestQueue);
  }
}

async function runHttpHybridCrawler(
  categoryUrls: readonly string[],
  preset: AntiBlockPreset,
  proxyUrlOverride: string | undefined,
  options: RunSubitoCrawlerOptions,
  httpMode: UseHttpCrawlerMode,
): Promise<CrawlResult> {
  const knownMap = options.knownMap ?? new Map<string, string>();
  const earlyStopK = options.earlyStopK ?? 5;
  const isFullRefresh = options.isFullRefresh ?? false;
  const crawlMode = options.mode ?? (isFullRefresh ? 'full' : 'incremental');

  const crawleeOpts = presetToCrawleeOptions(preset);
  const proxyUrl = proxyUrlOverride;
  if (proxyUrl) {
    console.log(`HTTP crawler proxy: ${maskProxyHost(proxyUrl)}`);
  }

  const proxyConfiguration = proxyUrl
    ? new ProxyConfiguration({ proxyUrls: [proxyUrl] })
    : undefined;

  const rawListings: RawListing[] = [];
  const detailCandidatePool: EarlyStopListing[] = [];
  let httpRequests = 0;
  let listingsSkippedAtCrawl = 0;
  let listingsSeenThisRun = 0;
  const jsonCompletenessSamples: number[] = [];
  const blockRetryUrls = new Set<string>();
  const blockRetriedUrls = new Set<string>();
  const failedUrls = new Set<string>();
  const urlStats = initUrlStats(categoryUrls);
  const categoryQueue = await openRunRequestQueue(options.runId);

  try {
  const httpCrawler = new HttpCrawler({
    requestQueue: categoryQueue,
    proxyConfiguration,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: sessionPoolOptions(crawleeOpts.maxPoolSize),
    maxRequestRetries: crawleeOpts.maxRequestRetries,
    minConcurrency: crawleeOpts.minConcurrency,
    errorHandler({ request }, error) {
      proxyErrorHandler(request, error);
    },
    async requestHandler({ request, body, session, response }) {
      httpRequests += 1;
      const html = typeof body === 'string' ? body : body.toString();

      if (isBlockedHttpResponse(response?.statusCode, html)) {
        session?.retire();
        blockRetryUrls.add(request.url);
        return;
      }

      const result = processCategoryHtml(
        html,
        request.url,
        knownMap,
        earlyStopK,
        isFullRefresh,
      );

      if (result.blocked) {
        session?.retire();
        blockRetryUrls.add(request.url);
        return;
      }

      listingsSkippedAtCrawl += result.listingsSkippedAtCrawl;
      listingsSeenThisRun += ingestCategoryResults(result, rawListings, detailCandidatePool);
      jsonCompletenessSamples.push(result.jsonFieldCompleteness);
      recordCategorySuccess(urlStats, request.url, result);
    },
  });

  await httpCrawler.run([...categoryUrls]);

  if (blockRetryUrls.size > 0) {
    const retryQueue = await openRunRequestQueue(
      options.runId ? `${options.runId}-retry` : undefined,
    );
    try {
    const blockRetryCrawler = new PlaywrightCrawler({
      requestQueue: retryQueue,
      proxyConfiguration,
      useSessionPool: true,
      persistCookiesPerSession: true,
      sessionPoolOptions: sessionPoolOptions(crawleeOpts.maxPoolSize),
      maxRequestRetries: crawleeOpts.maxRequestRetries,
      minConcurrency: FALLBACK_CONCURRENCY,
      maxConcurrency: FALLBACK_CONCURRENCY,
      launchContext: {
        launchOptions: {
          headless: true,
        },
      },
      async requestHandler({ page, session, request }) {
        if (blockRetriedUrls.has(request.url)) {
          return;
        }
        blockRetriedUrls.add(request.url);

        await dismissCookieBanner(page);

        const title = await page.title();
        if (title.toLowerCase().includes('blocked')) {
          session?.retire();
          failedUrls.add(request.url);
          return;
        }

        try {
          const cookies = await page.context().cookies('https://www.subito.it');
          if (cookies.length > 0 && session) {
            await session.setCookies(cookies, 'https://www.subito.it');
          }
        } catch {
          /* cookie export best-effort — D-15-14 */
        }

        const html = await page.content();
        const result = processCategoryHtml(
          html,
          request.url,
          knownMap,
          earlyStopK,
          isFullRefresh,
        );

        if (result.blocked) {
          failedUrls.add(request.url);
          recordCategoryBlocked(urlStats, request.url);
          return;
        }

        blockRetryUrls.delete(request.url);
        listingsSkippedAtCrawl += result.listingsSkippedAtCrawl;
        listingsSeenThisRun += ingestCategoryResults(result, rawListings, detailCandidatePool);
        jsonCompletenessSamples.push(result.jsonFieldCompleteness);
        recordCategorySuccess(urlStats, request.url, result);
      },
    });

    await blockRetryCrawler.run([...blockRetryUrls].map((url) => ({ url })));
    } finally {
      await dropRunRequestQueue(retryQueue);
    }
  }

  for (const url of blockRetryUrls) {
    failedUrls.add(url);
    recordCategoryBlocked(urlStats, url);
  }

  const detailBudget = detailBudgetCap(listingsSeenThisRun);
  const { selected: detailSelected, deferred: detailDeferred } = selectDetailCandidates(
    detailCandidatePool,
    detailBudget,
  );

  if (detailDeferred.length > 0) {
    console.log(
      JSON.stringify({
        event: 'detail_cap_deferred',
        deferred: detailDeferred.length,
        budget: detailBudget,
        listings_seen: listingsSeenThisRun,
      }),
    );
    for (const entry of detailDeferred) {
      rawListings.push(toRawListing(entry));
    }
  }

  const fallbackRequests: Array<{ url: string; userData: FallbackUserData }> = [];

  for (const entry of detailSelected) {
    fallbackRequests.push({
      url: entry.external_url,
      userData: {
        kind: 'detail',
        sourceCategoryUrl: entry.source_category_url,
        listing: entry,
      },
    });
  }

  let selectorHits = 0;
  let selectorTotal = 0;

  if (fallbackRequests.length > 0) {
    const detailQueue = await openRunRequestQueue(
      options.runId ? `${options.runId}-detail` : undefined,
    );
    try {
    const detailCrawler = new PlaywrightCrawler({
      requestQueue: detailQueue,
      proxyConfiguration,
      useSessionPool: true,
      persistCookiesPerSession: true,
      sessionPoolOptions: sessionPoolOptions(crawleeOpts.maxPoolSize),
      maxRequestRetries: crawleeOpts.maxRequestRetries,
      minConcurrency: FALLBACK_CONCURRENCY,
      maxConcurrency: FALLBACK_CONCURRENCY,
      launchContext: {
        launchOptions: {
          headless: true,
        },
      },
      async requestHandler({ page, request }) {
        const userData = request.userData as FallbackUserData;

        await dismissCookieBanner(page);

        const sourceCategoryUrl = userData.sourceCategoryUrl ?? '';
        const { listing, hitRate } = await extractFromDetailPage(page, sourceCategoryUrl);
        selectorHits += hitRate.hits;
        selectorTotal += hitRate.total;

        if (!listing) {
          if (userData.listing) {
            rawListings.push(toRawListing(userData.listing));
          }
          return;
        }

        rawListings.push(listing);
      },
    });

    await detailCrawler.run(fallbackRequests);
    } finally {
      await dropRunRequestQueue(detailQueue);
    }
  }

  const jsonFieldCompleteness =
    jsonCompletenessSamples.length > 0
      ? jsonCompletenessSamples.reduce((a, b) => a + b, 0) / jsonCompletenessSamples.length
      : 0;

  if (httpMode === 'shadow') {
    console.log(
      JSON.stringify({
        event: 'shadow_compare',
        http_requests: httpRequests,
        http_listings: rawListings.length,
        listings_skipped_at_crawl: listingsSkippedAtCrawl,
        json_field_completeness: jsonFieldCompleteness,
        blocked_url_count: failedUrls.size,
        detail_cap_deferred: detailDeferred.length,
      }),
    );
  }

  return {
    rawListings,
    selectorHitRate: selectorTotal > 0 ? selectorHits / selectorTotal : jsonFieldCompleteness,
    httpRequests,
    listingsSkippedAtCrawl,
    jsonFieldCompleteness,
    blockedUrlCount: failedUrls.size,
    detailCapDeferred: detailDeferred.length,
    crawlMode,
    urlBreakdown: [...urlStats.values()],
  };
  } finally {
    await dropRunRequestQueue(categoryQueue);
  }
}

export async function runSubitoCrawler(
  categoryUrls: readonly string[],
  preset: AntiBlockPreset = 'standard',
  proxyUrlOverride?: string,
  options: RunSubitoCrawlerOptions = {},
): Promise<CrawlResult> {
  const crawlMode = options.mode ?? (options.isFullRefresh ? 'full' : 'incremental');
  const proxyUrl = resolveCrawlerProxyUrl(options.proxyUrlOverride, proxyUrlOverride);

  if (!isHttpCrawlerEnabled()) {
    const legacy = await runLegacyPlaywrightCrawler(
      categoryUrls,
      preset,
      proxyUrl,
      options.runId,
    );
    return {
      ...legacy,
      httpRequests: 0,
      listingsSkippedAtCrawl: 0,
      jsonFieldCompleteness: 0,
      blockedUrlCount: 0,
      detailCapDeferred: 0,
      crawlMode,
      urlBreakdown: buildUrlBreakdownFromListings(categoryUrls, legacy.rawListings, new Set()),
    };
  }

  return runHttpHybridCrawler(
    categoryUrls,
    preset,
    proxyUrl,
    options,
    getUseHttpCrawlerMode(),
  );
}
