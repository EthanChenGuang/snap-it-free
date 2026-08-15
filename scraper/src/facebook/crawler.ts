import {
  PlaywrightCrawler,
  ProxyConfiguration,
  RequestQueue,
} from 'crawlee';
import { presetToCrawleeOptions, type AntiBlockPreset } from '../admin/presets.js';
import type {
  CategoryUrlStats,
  CrawlMode,
  CrawlResult,
  RunSubitoCrawlerOptions,
} from '../subito/crawler.js';
import type { RawListing } from '../subito/extract.js';
import { rejectReasonIfNotFacebookFree } from './filters.js';
import {
  loadFixtureSearchGraphql,
  parseGraphqlSearchResponse,
} from './graphql-extract.js';
import { applySessionToContext, type SessionPayload } from './session.js';

export type RunFacebookCrawlerOptions = RunSubitoCrawlerOptions & {
  session: SessionPayload;
  /** Test-only: map category URL → raw GraphQL JSON body (skips live Playwright). */
  fixtureGraphqlBodies?: ReadonlyMap<string, string>;
};

function sessionPoolOptions(maxPoolSize: number) {
  return {
    maxPoolSize,
    persistenceOptions: { enable: false },
  };
}

async function openRunRequestQueue(runId?: string): Promise<RequestQueue> {
  const name = runId ? `facebook-run-${runId}` : `facebook-${Date.now()}`;
  return RequestQueue.open(name);
}

async function dropRunRequestQueue(queue: RequestQueue): Promise<void> {
  await queue.drop();
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

function cardsToRawListings(
  cards: ReturnType<typeof parseGraphqlSearchResponse>['listings'],
  postedAt: string,
): { raw: RawListing[]; rejected: number } {
  const raw: RawListing[] = [];
  let rejected = 0;

  for (const card of cards) {
    const reject = rejectReasonIfNotFacebookFree(card.price_amount, card.price_formatted);
    if (reject) {
      rejected += 1;
      continue;
    }

    raw.push({
      source: 'facebook',
      external_id: card.external_id,
      title: card.title,
      photo_url: card.photo_url,
      external_url: card.external_url,
      lat: null,
      lng: null,
      posted_at: postedAt,
      price: card.price_amount,
      price_formatted: card.price_formatted,
      city: card.location_label || null,
      source_category_url: card.source_category_url,
    });
  }

  return { raw, rejected };
}

function processFixtureBody(
  body: string,
  categoryUrl: string,
  postedAt: string,
): { raw: RawListing[]; rejected: number; jsonFieldCompleteness: number } {
  const parsed = parseGraphqlSearchResponse(body, categoryUrl);
  const { raw, rejected } = cardsToRawListings(parsed.listings, postedAt);
  return { raw, rejected, jsonFieldCompleteness: parsed.jsonFieldCompleteness };
}

async function runFixtureCrawler(
  categoryUrls: readonly string[],
  fixtureBodies: ReadonlyMap<string, string>,
  crawlMode: CrawlMode,
): Promise<CrawlResult> {
  const rawListings: RawListing[] = [];
  const seenIds = new Set<string>();
  const urlStats = initUrlStats(categoryUrls);
  let listingsSkippedAtCrawl = 0;
  const completenessSamples: number[] = [];
  const postedAt = new Date().toISOString();

  for (const url of categoryUrls) {
    const body = fixtureBodies.get(url) ?? loadFixtureSearchGraphql();
    const { raw, rejected, jsonFieldCompleteness } = processFixtureBody(body, url, postedAt);
    completenessSamples.push(jsonFieldCompleteness);
    listingsSkippedAtCrawl += rejected;

    for (const listing of raw) {
      if (seenIds.has(listing.external_id)) continue;
      seenIds.add(listing.external_id);
      rawListings.push(listing);
    }

    const stats = urlStats.get(url);
    if (stats) {
      stats.listingsFound = raw.length;
      stats.listingsSkippedAtCrawl = rejected;
    }
  }

  const jsonFieldCompleteness =
    completenessSamples.length === 0
      ? 0
      : completenessSamples.reduce((a, b) => a + b, 0) / completenessSamples.length;

  return {
    rawListings,
    selectorHitRate: jsonFieldCompleteness,
    httpRequests: 0,
    listingsSkippedAtCrawl,
    jsonFieldCompleteness,
    blockedUrlCount: 0,
    detailCapDeferred: 0,
    crawlMode,
    urlBreakdown: [...urlStats.values()],
  };
}

/**
 * Minimal Facebook Playwright crawler — GraphQL intercept on search URLs (D-18-40 tracer).
 * Concurrency 1; free-price gate before raw output; page 1 only.
 */
export async function runFacebookCrawler(
  categoryUrls: readonly string[],
  preset: AntiBlockPreset = 'conservative',
  proxyUrlOverride?: string,
  options: RunFacebookCrawlerOptions = { session: { cookies: [] } },
): Promise<CrawlResult> {
  const crawlMode = options.mode ?? (options.isFullRefresh ? 'full' : 'incremental');
  const fixtureBodies = options.fixtureGraphqlBodies;

  if (fixtureBodies) {
    return runFixtureCrawler(categoryUrls, fixtureBodies, crawlMode);
  }

  if (!proxyUrlOverride) {
    throw new Error('Facebook crawl requires residential proxy (D-18-08)');
  }

  const crawleeOpts = presetToCrawleeOptions(preset);
  const proxyConfiguration = new ProxyConfiguration({ proxyUrls: [proxyUrlOverride] });
  const rawListings: RawListing[] = [];
  const seenIds = new Set<string>();
  const urlStats = initUrlStats(categoryUrls);
  let listingsSkippedAtCrawl = 0;
  let blockedUrlCount = 0;
  const completenessSamples: number[] = [];
  const postedAt = new Date().toISOString();

  const requestQueue = await openRunRequestQueue(options.runId);
  try {
    const crawler = new PlaywrightCrawler({
      requestQueue,
      proxyConfiguration,
      useSessionPool: true,
      persistCookiesPerSession: true,
      sessionPoolOptions: sessionPoolOptions(crawleeOpts.maxPoolSize),
      maxRequestRetries: crawleeOpts.maxRequestRetries,
      minConcurrency: 1,
      maxConcurrency: 1,
      launchContext: { launchOptions: { headless: true } },
      async requestHandler({ page, request }) {
        await applySessionToContext(page.context(), options.session);

        const capturedBodies: string[] = [];
        page.on('response', async (response) => {
          const responseUrl = response.url();
          if (!responseUrl.includes('/api/graphql')) return;
          if (response.request().method() !== 'POST') return;
          try {
            const text = await response.text();
            if (text.includes('feed_units') || text.includes('marketplace_search')) {
              capturedBodies.push(text);
            }
          } catch {
            // Response body may be unavailable after navigation — ignore.
          }
        });

        await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        const finalUrl = page.url();
        if (/\/login\/?(\?|$)/i.test(finalUrl) || /checkpoint/i.test(finalUrl)) {
          blockedUrlCount += 1;
          const stats = urlStats.get(request.url);
          if (stats) stats.blocked = true;
          return;
        }

        let parsedCount = 0;
        let rejected = 0;
        for (const body of capturedBodies) {
          try {
            const { raw, rejected: bodyRejected, jsonFieldCompleteness } = processFixtureBody(
              body,
              request.url,
              postedAt,
            );
            completenessSamples.push(jsonFieldCompleteness);
            rejected += bodyRejected;
            for (const listing of raw) {
              if (seenIds.has(listing.external_id)) continue;
              seenIds.add(listing.external_id);
              rawListings.push(listing);
              parsedCount += 1;
            }
          } catch {
            // Ignore unparsable GraphQL responses — other intercepts may match.
          }
        }

        listingsSkippedAtCrawl += rejected;
        const stats = urlStats.get(request.url);
        if (stats) {
          stats.listingsFound = parsedCount;
          stats.listingsSkippedAtCrawl = rejected;
        }
      },
    });

    await crawler.run([...categoryUrls]);
  } finally {
    await dropRunRequestQueue(requestQueue);
  }

  const jsonFieldCompleteness =
    completenessSamples.length === 0
      ? 0
      : completenessSamples.reduce((a, b) => a + b, 0) / completenessSamples.length;

  return {
    rawListings,
    selectorHitRate: jsonFieldCompleteness,
    httpRequests: categoryUrls.length,
    listingsSkippedAtCrawl,
    jsonFieldCompleteness,
    blockedUrlCount,
    detailCapDeferred: 0,
    crawlMode,
    urlBreakdown: [...urlStats.values()],
  };
}
