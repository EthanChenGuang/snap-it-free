import {
  HttpCrawler,
  PlaywrightCrawler,
  ProxyConfiguration,
  RequestQueue,
} from 'crawlee';
import { gotScraping } from 'got-scraping';
import { presetToCrawleeOptions, type AntiBlockPreset } from '../admin/presets.js';
import { resolveCrawlerProxyUrl } from '../config.js';
import { getProxyFatalFailure, ProxyQuotaFatalError } from '../shared/proxy-errors.js';
import { applyEarlyStop, type EarlyStopListing } from '../subito/early-stop.js';
import { FALLBACK_CONCURRENCY } from '../subito/fallback-queue.js';
import type {
  CategoryUrlStats,
  CrawlMode,
  CrawlResult,
  RunSubitoCrawlerOptions,
} from '../subito/crawler.js';
import type { RawListing } from '../subito/extract.js';
import { catalogUrlToApiParams } from './catalog-api.js';
import { detailBudgetCap, selectVintedDetailCandidates } from './detail-queue.js';
import { enrichListingDetail } from './enrich.js';
import { isFreePrice } from './filters.js';
import {
  CategoryParseError,
  parseCatalogApiResponse,
  type VintedCatalogListing,
} from './http-extract.js';

export type RunVintedCrawlerOptions = RunSubitoCrawlerOptions;

const API_ORIGIN = 'https://www.vinted.it';
const CATALOG_ITEMS_ENDPOINT = '/api/v2/catalog/items';
const TLS_OPTIONS = {
  browsers: [{ name: 'chrome', minVersion: 120 }],
  devices: ['desktop'],
  locales: ['it-IT'],
};
const REQUEST_TIMEOUT_MS = 20000;

type CategoryProcessResult = {
  workQueue: VintedCatalogListing[];
  touchCandidates: VintedCatalogListing[];
  listingsSkippedAtCrawl: number;
  jsonFieldCompleteness: number;
  blocked: boolean;
  stoppedEarly: boolean;
  notFreeRejected: number;
};

export function sessionPoolOptions(maxPoolSize: number) {
  return {
    maxPoolSize,
    // Override Crawlee's default blocked statuses; otherwise it throws before requestHandler runs.
    // 401/403/429 are handled in requestHandler (retire session + Playwright fallback).
    blockedStatusCodes: [],
    persistenceOptions: { enable: false },
  };
}

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
  if (!stats) return;
  stats.listingsFound += result.workQueue.length + result.touchCandidates.length;
  stats.listingsSkippedAtCrawl +=
    result.listingsSkippedAtCrawl + result.notFreeRejected;
  if (result.stoppedEarly) {
    stats.earlyStopTriggered = true;
  }
}

function recordCategoryBlocked(
  urlStats: Map<string, CategoryUrlStats>,
  categoryUrl: string,
): void {
  const stats = urlStats.get(categoryUrl);
  if (!stats) return;
  stats.blocked = true;
}

function buildCookieHeaderFromSessionCookies(
  cookies: Array<{ name: string; value: string }>,
): string {
  const byName = new Map<string, string>();
  for (const cookie of cookies) {
    if (!cookie.value) continue;
    byName.set(cookie.name, `${cookie.name}=${cookie.value}`);
  }
  return [...byName.values()].join('; ');
}

function buildCookieHeader(setCookies: unknown): string {
  const raw = Array.isArray(setCookies) ? setCookies : [];
  const byName = new Map<string, string>();
  for (const entry of raw) {
    const pair = String(entry ?? '').split(';')[0];
    if (!pair.includes('=')) continue;
    const eq = pair.indexOf('=');
    const value = pair.slice(eq + 1);
    if (!value) continue;
    byName.set(pair.slice(0, eq), pair);
  }
  return [...byName.values()].join('; ');
}

async function fetchCatalogApiBody(
  categoryUrl: string,
  cookieHeader: string,
  proxyUrl?: string,
): Promise<string> {
  const params = catalogUrlToApiParams(categoryUrl).toString();
  const apiRes = await gotScraping({
    url: `${API_ORIGIN}${CATALOG_ITEMS_ENDPOINT}?${params}`,
    headerGeneratorOptions: TLS_OPTIONS,
    timeout: { request: REQUEST_TIMEOUT_MS },
    headers: {
      accept: 'application/json',
      referer: categoryUrl,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    ...(proxyUrl ? { proxyUrl } : {}),
  });
  if (apiRes.statusCode !== 200) {
    throw new CategoryParseError(`catalog API HTTP ${apiRes.statusCode}`, 'missing_api_data');
  }
  return typeof apiRes.body === 'string' ? apiRes.body : apiRes.body.toString();
}

function processCatalogItems(
  apiBody: string,
  categoryUrl: string,
  knownMap: Map<string, string>,
  earlyStopK: number,
  isFullRefresh: boolean,
): CategoryProcessResult {
  try {
    const parsed = parseCatalogApiResponse(apiBody, categoryUrl);
    const freeListings: VintedCatalogListing[] = [];
    let notFreeRejected = 0;

    for (const listing of parsed.listings) {
      if (!isFreePrice(listing.price)) {
        notFreeRejected += 1;
        continue;
      }
      freeListings.push(listing);
    }

    const early = applyEarlyStop({
      listings: freeListings as EarlyStopListing[],
      knownMap,
      earlyStopK,
      isFullRefresh,
    });

    return {
      workQueue: early.workQueue as VintedCatalogListing[],
      touchCandidates: early.touchCandidates as VintedCatalogListing[],
      listingsSkippedAtCrawl: early.listingsSkippedAtCrawl,
      jsonFieldCompleteness: parsed.jsonFieldCompleteness,
      blocked: false,
      stoppedEarly: early.stoppedEarly,
      notFreeRejected,
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
        notFreeRejected: 0,
      };
    }
    throw error;
  }
}

function proxyErrorHandler(
  request: { noRetry?: boolean },
  error: unknown,
): void {
  const fatalReason = getProxyFatalFailure(error);
  if (!fatalReason) return;
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

function isBlockedHttpResponse(statusCode: number | undefined, body: string): boolean {
  if (statusCode === 401 || statusCode === 403 || statusCode === 429) return true;
  if (/blocked|access denied|captcha|datadome/i.test(body.slice(0, 4000))) return true;
  return false;
}

export function buildRunRequestQueueName(
  runId?: string,
  queueKind: 'main' | 'retry' = 'main',
): string {
  const sanitized = runId?.replace(/[^a-zA-Z0-9-]/g, '') || `${Date.now()}`;
  const suffix =
    queueKind === 'main'
      ? sanitized.slice(0, 36)
      : `${sanitized.slice(0, 30)}-${queueKind}`;
  return `vinted-run-${suffix}`;
}

async function openRunRequestQueue(
  runId?: string,
  queueKind: 'main' | 'retry' = 'main',
): Promise<RequestQueue> {
  return RequestQueue.open(buildRunRequestQueueName(runId, queueKind));
}

async function dropRunRequestQueue(queue: RequestQueue): Promise<void> {
  try {
    await queue.drop();
  } catch {
    /* best-effort */
  }
}

async function enrichWorkQueue(
  workQueue: VintedCatalogListing[],
  touchCandidates: VintedCatalogListing[],
  cookieHeader: string,
  proxyUrl: string | undefined,
  scrapeRunTime: Date,
): Promise<{ rawListings: RawListing[]; detailCapDeferred: number }> {
  const rawListings: RawListing[] = [];
  const detailCandidatePool = [...workQueue];
  const listingsSeen = workQueue.length + touchCandidates.length;
  const detailBudget = detailBudgetCap(listingsSeen);
  const { selected, deferred } = selectVintedDetailCandidates(detailCandidatePool, detailBudget);

  for (const touch of touchCandidates) {
    rawListings.push({
      ...touch,
      source: 'vinted',
      posted_at: scrapeRunTime.toISOString(),
    });
  }

  for (const entry of selected) {
    const enriched = await enrichListingDetail(entry, {
      cookieHeader,
      proxyUrl,
      scrapeRunTime,
    });
    if (enriched.ok) {
      rawListings.push(enriched.listing);
    }
  }

  for (const entry of deferred) {
    rawListings.push({
      ...entry,
      source: 'vinted',
      posted_at: scrapeRunTime.toISOString(),
    });
  }

  if (deferred.length > 0) {
    console.log(
      JSON.stringify({
        event: 'vinted_detail_cap_deferred',
        deferred: deferred.length,
        budget: detailBudget,
        listings_seen: listingsSeen,
      }),
    );
  }

  return { rawListings, detailCapDeferred: deferred.length };
}

export async function runVintedCrawler(
  categoryUrls: readonly string[],
  preset: AntiBlockPreset = 'standard',
  proxyUrlOverride?: string,
  options: RunVintedCrawlerOptions = {},
): Promise<CrawlResult> {
  const knownMap = options.knownMap ?? new Map<string, string>();
  const earlyStopK = options.earlyStopK ?? 5;
  const isFullRefresh = options.isFullRefresh ?? false;
  const crawlMode: CrawlMode = options.mode ?? (isFullRefresh ? 'full' : 'incremental');
  const crawleeOpts = presetToCrawleeOptions(preset);
  const proxyUrl = resolveCrawlerProxyUrl(options.proxyUrlOverride, proxyUrlOverride);

  if (proxyUrl) {
    console.log(`Vinted HTTP crawler proxy: ${maskProxyHost(proxyUrl)}`);
  } else {
    console.log('Vinted HTTP crawler: direct (no proxy)');
  }

  const proxyConfiguration = proxyUrl
    ? new ProxyConfiguration({ proxyUrls: [proxyUrl] })
    : undefined;

  const rawListings: RawListing[] = [];
  let httpRequests = 0;
  let listingsSkippedAtCrawl = 0;
  const jsonCompletenessSamples: number[] = [];
  const blockRetryUrls = new Set<string>();
  const blockRetriedUrls = new Set<string>();
  const failedUrls = new Set<string>();
  const urlStats = initUrlStats(categoryUrls);
  const categoryQueue = await openRunRequestQueue(options.runId);
  const scrapeRunTime = new Date();
  let sessionCookieHeader = '';
  let detailCapDeferred = 0;

  const pendingWork: VintedCatalogListing[] = [];
  const pendingTouch: VintedCatalogListing[] = [];

  try {
    const httpCrawler = new HttpCrawler({
      requestQueue: categoryQueue,
      proxyConfiguration,
      useSessionPool: true,
      persistCookiesPerSession: true,
      sessionPoolOptions: sessionPoolOptions(crawleeOpts.maxPoolSize),
      maxRequestRetries: crawleeOpts.maxRequestRetries,
      minConcurrency: crawleeOpts.minConcurrency,
      maxConcurrency: crawleeOpts.maxConcurrency,
      errorHandler({ request }, error) {
        proxyErrorHandler(request, error);
      },
      async requestHandler({ request, body, session, response }) {
        httpRequests += 1;
        const warmBody = typeof body === 'string' ? body : body.toString();

        if (isBlockedHttpResponse(response?.statusCode, warmBody)) {
          session?.retire();
          blockRetryUrls.add(request.url);
          return;
        }

        const sessionCookies = session ? await session.getCookies(API_ORIGIN) : [];
        const cookieHeader =
          buildCookieHeaderFromSessionCookies(sessionCookies) ||
          buildCookieHeader(response?.headers?.['set-cookie']);
        if (cookieHeader) {
          sessionCookieHeader = cookieHeader;
        }

        let apiBody: string;
        try {
          httpRequests += 1;
          apiBody = await fetchCatalogApiBody(request.url, cookieHeader, proxyUrl);
        } catch {
          session?.retire();
          blockRetryUrls.add(request.url);
          return;
        }

        const result = processCatalogItems(
          apiBody,
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

        listingsSkippedAtCrawl += result.listingsSkippedAtCrawl + result.notFreeRejected;
        pendingWork.push(...result.workQueue);
        pendingTouch.push(...result.touchCandidates);
        jsonCompletenessSamples.push(result.jsonFieldCompleteness);
        recordCategorySuccess(urlStats, request.url, result);
      },
    });

    await httpCrawler.run([...categoryUrls]);

    if (blockRetryUrls.size > 0) {
      const retryQueue = await openRunRequestQueue(options.runId, 'retry');
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
          launchContext: { launchOptions: { headless: true } },
          async requestHandler({ page, session, request }) {
            if (blockRetriedUrls.has(request.url)) return;
            blockRetriedUrls.add(request.url);

            const title = await page.title();
            if (title.toLowerCase().includes('blocked')) {
              session?.retire();
              failedUrls.add(request.url);
              return;
            }

            try {
              const cookies = await page.context().cookies(API_ORIGIN);
              if (cookies.length > 0 && session) {
                await session.setCookies(cookies, API_ORIGIN);
              }
            } catch {
              /* cookie export best-effort */
            }

            const cookieHeader = buildCookieHeaderFromSessionCookies(
              (await page.context().cookies(API_ORIGIN)).map((c) => ({
                name: c.name,
                value: c.value,
              })),
            );
            if (cookieHeader) sessionCookieHeader = cookieHeader;

            let apiBody: string;
            try {
              httpRequests += 1;
              apiBody = await fetchCatalogApiBody(request.url, cookieHeader, proxyUrl);
            } catch {
              failedUrls.add(request.url);
              recordCategoryBlocked(urlStats, request.url);
              return;
            }

            const result = processCatalogItems(
              apiBody,
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
            listingsSkippedAtCrawl += result.listingsSkippedAtCrawl + result.notFreeRejected;
            pendingWork.push(...result.workQueue);
            pendingTouch.push(...result.touchCandidates);
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

    const enriched = await enrichWorkQueue(
      pendingWork,
      pendingTouch,
      sessionCookieHeader,
      proxyUrl,
      scrapeRunTime,
    );
    rawListings.push(...enriched.rawListings);
    detailCapDeferred = enriched.detailCapDeferred;

    const jsonFieldCompleteness =
      jsonCompletenessSamples.length > 0
        ? jsonCompletenessSamples.reduce((a, b) => a + b, 0) / jsonCompletenessSamples.length
        : 0;

    return {
      rawListings,
      selectorHitRate: jsonFieldCompleteness,
      httpRequests,
      listingsSkippedAtCrawl,
      jsonFieldCompleteness,
      blockedUrlCount: failedUrls.size,
      detailCapDeferred,
      crawlMode,
      urlBreakdown: [...urlStats.values()],
    };
  } finally {
    await dropRunRequestQueue(categoryQueue);
  }
}
