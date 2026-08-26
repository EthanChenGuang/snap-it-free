import {
  PlaywrightCrawler,
  ProxyConfiguration,
  RequestQueue,
} from 'crawlee';
import { presetToCrawleeOptions, type AntiBlockPreset } from '../admin/presets.js';
import { resolveCrawlerProxyUrl } from '../config.js';
import { getProxyFatalFailure, ProxyQuotaFatalError } from '../shared/proxy-errors.js';
import type {
  CategoryUrlStats,
  CrawlMode,
  CrawlResult,
  RunSubitoCrawlerOptions,
} from '../subito/crawler.js';
import {
  processWallapopSearchBody,
  type WallapopSearchListing,
} from './process-search.js';
import { searchSeedUrlToApiUrl } from './search-api.js';

export type RunWallapopPlaywrightOptions = RunSubitoCrawlerOptions;

const WALLAPOP_HOME_URL = 'https://it.wallapop.com/';
const WALLAPOP_SEARCH_API_LOOSE = /api\.wallapop\.com.*\/search/i;
const PAGE_GOTO_TIMEOUT_MS = 45_000;
const HOME_WARMUP_WAIT_MS = 2_000;
const POST_LOAD_WAIT_MS = 5_000;
const SEARCH_API_WAIT_MS = 20_000;

import {
  PLAYWRIGHT_LOW_MEMORY_LAUNCH,
  playwrightSessionPoolOptions,
} from '../shared/playwright-launch.js';

async function openRunRequestQueue(runId?: string): Promise<RequestQueue> {
  const name = runId ? `wallapop-run-${runId}` : `wallapop-${Date.now()}`;
  return RequestQueue.open(name);
}

async function dropRunRequestQueue(queue: RequestQueue): Promise<void> {
  await queue.drop().catch(() => undefined);
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

function maskProxyHost(proxyUrl: string): string {
  try {
    const u = new URL(proxyUrl);
    return `${u.protocol}//${u.hostname}:****`;
  } catch {
    return '[proxy]';
  }
}

function isWallapopSearchApiResponse(url: string, status: number, body: string): boolean {
  return (
    WALLAPOP_SEARCH_API_LOOSE.test(url) &&
    status === 200 &&
    body.includes('search_objects')
  );
}

async function isWallapopBlockedPage(page: {
  title: () => Promise<string>;
  content: () => Promise<string>;
  url: () => string;
}): Promise<boolean> {
  const [title, body, finalUrl] = await Promise.all([
    page.title(),
    page.content(),
    Promise.resolve(page.url()),
  ]);
  const haystack = `${title}\n${body.slice(0, 500)}\n${finalUrl}`.toLowerCase();
  return (
    /could not be satisfied|request blocked|access denied|captcha|cloudfront/i.test(haystack)
  );
}

async function dismissCookieBanner(page: {
  locator: (selector: string) => {
    first: () => { click: (opts: { timeout: number }) => Promise<void> };
  };
}): Promise<void> {
  for (const selector of [
    '#onetrust-accept-btn-handler',
    'button:has-text("Accetta")',
    'button:has-text("Accept")',
  ]) {
    try {
      await page.locator(selector).first().click({ timeout: 1_500 });
      return;
    } catch {
      // Banner absent or already dismissed.
    }
  }
}

async function fetchSearchApiInPage(
  page: {
    evaluate: <T>(fn: (url: string) => Promise<T>, url: string) => Promise<T>;
  },
  seedUrl: string,
): Promise<string | null> {
  const apiUrl = searchSeedUrlToApiUrl(seedUrl);
  const result = await page.evaluate(async (url) => {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const text = await response.text();
      return { status: response.status, text };
    } catch {
      return { status: 0, text: '' };
    }
  }, apiUrl);

  if (result.status === 200 && result.text.includes('search_objects')) {
    return result.text;
  }
  return null;
}

async function captureSearchApiBodies(
  page: {
    on: (event: 'response', handler: (response: {
      url: () => string;
      status: () => number;
      text: () => Promise<string>;
    }) => void | Promise<void>) => void;
    goto: (url: string, opts: { waitUntil: 'domcontentloaded' | 'networkidle'; timeout: number }) => Promise<unknown>;
    waitForTimeout: (ms: number) => Promise<void>;
    waitForResponse: (
      predicate: (response: { url: () => string; status: () => number }) => boolean,
      opts: { timeout: number },
    ) => Promise<{ text: () => Promise<string> }>;
    title: () => Promise<string>;
    content: () => Promise<string>;
    url: () => string;
    locator: (selector: string) => {
      first: () => { click: (opts: { timeout: number }) => Promise<void> };
    };
    evaluate: <T>(fn: (url: string) => Promise<T>, url: string) => Promise<T>;
    mouse: { wheel: (deltaX: number, deltaY: number) => Promise<void> };
  },
  seedUrl: string,
): Promise<string[]> {
  const capturedBodies: string[] = [];
  const seen = new Set<string>();

  const pushBody = (body: string) => {
    if (!body.includes('search_objects') || seen.has(body)) return;
    seen.add(body);
    capturedBodies.push(body);
  };

  page.on('response', async (response) => {
    const responseUrl = response.url();
    if (!WALLAPOP_SEARCH_API_LOOSE.test(responseUrl)) return;
    try {
      const text = await response.text();
      if (isWallapopSearchApiResponse(responseUrl, response.status(), text)) {
        pushBody(text);
      }
    } catch {
      // Body may be unavailable after navigation.
    }
  });

  await page.goto(WALLAPOP_HOME_URL, {
    waitUntil: 'domcontentloaded',
    timeout: PAGE_GOTO_TIMEOUT_MS,
  });
  await page.waitForTimeout(HOME_WARMUP_WAIT_MS);
  await dismissCookieBanner(page);

  if (await isWallapopBlockedPage(page)) {
    return capturedBodies;
  }

  const searchApiResponse = page
    .waitForResponse(
      (response) =>
        WALLAPOP_SEARCH_API_LOOSE.test(response.url()) && response.status() === 200,
      { timeout: SEARCH_API_WAIT_MS },
    )
    .then(async (response) => {
      try {
        const text = await response.text();
        if (text.includes('search_objects')) {
          pushBody(text);
        }
      } catch {
        // ignore
      }
    })
    .catch(() => undefined);

  await page.goto(seedUrl, {
    waitUntil: 'networkidle',
    timeout: PAGE_GOTO_TIMEOUT_MS,
  });
  await searchApiResponse;
  await page.waitForTimeout(POST_LOAD_WAIT_MS);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(1_500);

  if (capturedBodies.length === 0) {
    const inPageBody = await fetchSearchApiInPage(page, seedUrl);
    if (inPageBody) {
      pushBody(inPageBody);
    }
  }

  return capturedBodies;
}

export async function runWallapopFixtureCrawler(
  categoryUrls: readonly string[],
  fixtureApiBodies: ReadonlyMap<string, string>,
  options: RunWallapopPlaywrightOptions = {},
): Promise<CrawlResult> {
  const knownMap = options.knownMap ?? new Map<string, string>();
  const earlyStopK = options.earlyStopK ?? 5;
  const isFullRefresh = options.isFullRefresh ?? false;
  const crawlMode: CrawlMode = options.mode ?? (isFullRefresh ? 'full' : 'incremental');

  const urlStats = initUrlStats(categoryUrls);
  const rawListings: WallapopSearchListing[] = [];
  let listingsSkippedAtCrawl = 0;
  const jsonCompletenessSamples: number[] = [];
  let blockedUrlCount = 0;

  for (const seedUrl of categoryUrls) {
    const body = fixtureApiBodies.get(seedUrl);
    if (!body) {
      blockedUrlCount += 1;
      const stats = urlStats.get(seedUrl);
      if (stats) stats.blocked = true;
      continue;
    }

    const result = processWallapopSearchBody(body, seedUrl, knownMap, earlyStopK, isFullRefresh);
    listingsSkippedAtCrawl += result.listingsSkippedAtCrawl + result.notFreeRejected;
    jsonCompletenessSamples.push(result.jsonFieldCompleteness);

    const stats = urlStats.get(seedUrl);
    if (!stats) continue;

    if (result.blocked) {
      stats.blocked = true;
      blockedUrlCount += 1;
      continue;
    }

    stats.listingsFound += result.workQueue.length + result.touchCandidates.length;
    stats.earlyStopTriggered = result.stoppedEarly;
    rawListings.push(...result.workQueue, ...result.touchCandidates);
  }

  const jsonFieldCompleteness =
    jsonCompletenessSamples.length === 0
      ? 0
      : jsonCompletenessSamples.reduce((a, b) => a + b, 0) / jsonCompletenessSamples.length;

  return {
    rawListings,
    selectorHitRate: rawListings.length > 0 ? 1 : 0,
    httpRequests: categoryUrls.length,
    listingsSkippedAtCrawl,
    jsonFieldCompleteness,
    blockedUrlCount,
    urlBreakdown: [...urlStats.values()],
    crawlMode,
  };
}

/**
 * Wallapop Playwright crawler — navigates web search pages and intercepts
 * /api/v3/general/search JSON (bypasses bare API CloudFront 403).
 */
export async function runWallapopPlaywrightCrawler(
  categoryUrls: readonly string[],
  preset: AntiBlockPreset = 'standard',
  proxyUrlOverride?: string,
  options: RunWallapopPlaywrightOptions = {},
): Promise<CrawlResult> {
  const knownMap = options.knownMap ?? new Map<string, string>();
  const earlyStopK = options.earlyStopK ?? 5;
  const isFullRefresh = options.isFullRefresh ?? false;
  const crawlMode: CrawlMode = options.mode ?? (isFullRefresh ? 'full' : 'incremental');
  const crawleeOpts = presetToCrawleeOptions(preset);

  const proxyUrl = resolveCrawlerProxyUrl(options.proxyUrlOverride, proxyUrlOverride);
  if (!proxyUrl) {
    throw new Error('Wallapop crawl requires residential proxy (D-25-02)');
  }

  console.log(`Wallapop Playwright crawler proxy: ${maskProxyHost(proxyUrl)}`);

  const proxyConfiguration = new ProxyConfiguration({ proxyUrls: [proxyUrl] });
  const urlStats = initUrlStats(categoryUrls);
  const rawListings: WallapopSearchListing[] = [];
  let httpRequests = 0;
  let listingsSkippedAtCrawl = 0;
  const jsonCompletenessSamples: number[] = [];
  let blockedUrlCount = 0;

  const searchQueue = await openRunRequestQueue(options.runId);
  try {
    const searchCrawler = new PlaywrightCrawler({
      requestQueue: searchQueue,
      proxyConfiguration,
      useSessionPool: true,
      persistCookiesPerSession: true,
      sessionPoolOptions: playwrightSessionPoolOptions(1),
      maxRequestRetries: crawleeOpts.maxRequestRetries,
      minConcurrency: 1,
      maxConcurrency: 1,
      launchContext: { launchOptions: PLAYWRIGHT_LOW_MEMORY_LAUNCH },
      async requestHandler({ page, request }) {
        httpRequests += 1;
        const capturedBodies = await captureSearchApiBodies(page, request.url);

        if (await isWallapopBlockedPage(page)) {
          blockedUrlCount += 1;
          const stats = urlStats.get(request.url);
          if (stats) stats.blocked = true;
          console.warn(`[wallapop] CloudFront/WAF block for ${request.url}`);
          return;
        }

        if (capturedBodies.length === 0) {
          blockedUrlCount += 1;
          const stats = urlStats.get(request.url);
          if (stats) stats.blocked = true;
          console.warn(`[wallapop] No search API response intercepted for ${request.url}`);
          return;
        }

        let categoryListings = 0;
        for (const body of capturedBodies) {
          const result = processWallapopSearchBody(
            body,
            request.url,
            knownMap,
            earlyStopK,
            isFullRefresh,
          );
          listingsSkippedAtCrawl += result.listingsSkippedAtCrawl + result.notFreeRejected;
          jsonCompletenessSamples.push(result.jsonFieldCompleteness);

          if (result.blocked) {
            continue;
          }

          rawListings.push(...result.workQueue, ...result.touchCandidates);
          categoryListings += result.workQueue.length + result.touchCandidates.length;

          const stats = urlStats.get(request.url);
          if (stats) {
            stats.listingsFound = categoryListings;
            stats.listingsSkippedAtCrawl = result.listingsSkippedAtCrawl + result.notFreeRejected;
            if (result.stoppedEarly) {
              stats.earlyStopTriggered = true;
            }
          }
        }

        if (categoryListings === 0) {
          blockedUrlCount += 1;
          const stats = urlStats.get(request.url);
          if (stats) stats.blocked = true;
        }
      },
      failedRequestHandler({ request, error }) {
        const fatalReason = getProxyFatalFailure(error);
        if (fatalReason) {
          throw new ProxyQuotaFatalError(fatalReason);
        }
        blockedUrlCount += 1;
        const stats = urlStats.get(request.url);
        if (stats) stats.blocked = true;
        console.warn(
          `[wallapop] Playwright failed for ${request.url}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      },
    });

    for (const url of categoryUrls) {
      await searchQueue.addRequest({ url });
    }

    await searchCrawler.run();
  } finally {
    await dropRunRequestQueue(searchQueue);
  }

  const jsonFieldCompleteness =
    jsonCompletenessSamples.length === 0
      ? 0
      : jsonCompletenessSamples.reduce((a, b) => a + b, 0) / jsonCompletenessSamples.length;

  console.log(
    JSON.stringify({
      event: 'wallapop_crawl_summary',
      crawl_mode: crawlMode,
      engine: 'playwright',
      urls: categoryUrls.length,
      free_listings: rawListings.length,
      blocked_url_count: blockedUrlCount,
      http_requests: httpRequests,
    }),
  );

  return {
    rawListings,
    selectorHitRate: rawListings.length > 0 ? 1 : 0,
    httpRequests,
    listingsSkippedAtCrawl,
    jsonFieldCompleteness,
    blockedUrlCount,
    urlBreakdown: [...urlStats.values()],
    crawlMode,
  };
}
