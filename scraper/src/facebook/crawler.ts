import {
  PlaywrightCrawler,
  ProxyConfiguration,
  RequestQueue,
} from 'crawlee';
import { presetToCrawleeOptions, type AntiBlockPreset } from '../admin/presets.js';
import { applyEarlyStop, type EarlyStopListing } from '../subito/early-stop.js';
import {
  detailBudgetCap,
  selectDetailCandidates,
} from '../subito/fallback-queue.js';
import type {
  CategoryUrlStats,
  CrawlMode,
  CrawlResult,
  RunSubitoCrawlerOptions,
} from '../subito/crawler.js';
import type { RawListing } from '../subito/extract.js';
import {
  cardNeedsDetailVisit,
  enrichFacebookCard,
  isFacebookLocalPickup,
  parseFacebookDetailFragment,
  type FacebookDetailFields,
} from './enrich.js';
import { rejectReasonIfNotFacebookFree } from './filters.js';
import {
  loadFixtureSearchGraphql,
  parseGraphqlSearchResponse,
  type FacebookCardListing,
} from './graphql-extract.js';
import { applySessionToContext, type SessionPayload } from './session.js';

export type RunFacebookCrawlerOptions = RunSubitoCrawlerOptions & {
  session: SessionPayload;
  /** Test-only: map category URL → raw GraphQL JSON body (skips live Playwright). */
  fixtureGraphqlBodies?: ReadonlyMap<string, string>;
  /** Test-only: map item URL → detail JSON body. */
  fixtureDetailBodies?: ReadonlyMap<string, string>;
};

type CategoryProcessResult = {
  workQueue: FacebookCardListing[];
  touchCandidates: FacebookCardListing[];
  listingsSkippedAtCrawl: number;
  jsonFieldCompleteness: number;
  blocked: boolean;
  stoppedEarly: boolean;
  pickupRejected: number;
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

function cardToEarlyStopListing(card: FacebookCardListing): EarlyStopListing {
  return {
    source: 'facebook',
    external_id: card.external_id,
    title: card.title,
    photo_url: card.photo_url,
    external_url: card.external_url,
    lat: null,
    lng: null,
    posted_at: '',
    price: card.price_amount,
    price_formatted: card.price_formatted,
    city: card.location_label || null,
    source_category_url: card.source_category_url,
  };
}

function processCategoryGraphql(
  body: string,
  categoryUrl: string,
  knownMap: Map<string, string>,
  earlyStopK: number,
  isFullRefresh: boolean,
): CategoryProcessResult {
  const parsed = parseGraphqlSearchResponse(body, categoryUrl);
  const pickupEligible: FacebookCardListing[] = [];
  let pickupRejected = 0;

  for (const card of parsed.listings) {
    const priceReject = rejectReasonIfNotFacebookFree(card.price_amount, card.price_formatted);
    if (priceReject) {
      pickupRejected += 1;
      continue;
    }
    if (!isFacebookLocalPickup(card.delivery_types)) {
      pickupRejected += 1;
      continue;
    }
    pickupEligible.push(card);
  }

  const early = applyEarlyStop({
    listings: pickupEligible.map((card) => cardToEarlyStopListing(card)),
    knownMap,
    earlyStopK,
    isFullRefresh,
  });

  const workQueue = early.workQueue.map((listing) => {
    const card = pickupEligible.find((item) => item.external_id === listing.external_id);
    return card!;
  });
  const touchCandidates = early.touchCandidates.map((listing) => {
    const card = pickupEligible.find((item) => item.external_id === listing.external_id);
    return card!;
  });

  return {
    workQueue,
    touchCandidates,
    listingsSkippedAtCrawl: early.listingsSkippedAtCrawl + pickupRejected,
    jsonFieldCompleteness: parsed.jsonFieldCompleteness,
    blocked: false,
    stoppedEarly: early.stoppedEarly,
    pickupRejected,
  };
}

function resolveDetailBody(
  card: FacebookCardListing,
  fixtureDetailBodies?: ReadonlyMap<string, string>,
): FacebookDetailFields | undefined {
  const fixture = fixtureDetailBodies?.get(card.external_url);
  if (fixture) {
    return parseFacebookDetailFragment(JSON.parse(fixture));
  }
  if (fixtureDetailBodies?.has('__default__')) {
    return parseFacebookDetailFragment(JSON.parse(fixtureDetailBodies.get('__default__')!));
  }
  return undefined;
}

function dedupeRawListings(listings: RawListing[]): RawListing[] {
  const seenIds = new Set<string>();
  const deduped: RawListing[] = [];
  for (const listing of listings) {
    if (seenIds.has(listing.external_id)) continue;
    seenIds.add(listing.external_id);
    deduped.push(listing);
  }
  return deduped;
}

function recordCategorySuccess(
  urlStats: Map<string, CategoryUrlStats>,
  categoryUrl: string,
  result: CategoryProcessResult,
  listingsFound: number,
): void {
  const stats = urlStats.get(categoryUrl);
  if (!stats) return;
  stats.listingsFound = listingsFound;
  stats.listingsSkippedAtCrawl = result.listingsSkippedAtCrawl;
  if (result.stoppedEarly) {
    stats.earlyStopTriggered = true;
  }
}

async function finalizeWorkQueues(
  workQueue: FacebookCardListing[],
  touchCandidates: FacebookCardListing[],
  postedAt: string,
  fixtureDetailBodies: ReadonlyMap<string, string> | undefined,
  detailFetcher?: (card: FacebookCardListing) => Promise<FacebookDetailFields | undefined>,
): Promise<{ rawListings: RawListing[]; detailCapDeferred: number; enrichRejected: number }> {
  const rawListings: RawListing[] = [];
  let enrichRejected = 0;

  for (const card of touchCandidates) {
    const detail = resolveDetailBody(card, fixtureDetailBodies);
    const enriched = enrichFacebookCard(card, postedAt, detail);
    if (enriched.ok) {
      rawListings.push(enriched.listing);
    } else {
      enrichRejected += 1;
    }
  }

  const listingsSeen = workQueue.length + touchCandidates.length;
  const detailBudget = detailBudgetCap(listingsSeen);
  const earlyStopListings = workQueue.map((card) => cardToEarlyStopListing(card));
  const { selected, deferred } = selectDetailCandidates(earlyStopListings, detailBudget);

  const selectedCards = selected
    .map((listing) => workQueue.find((card) => card.external_id === listing.external_id))
    .filter((card): card is FacebookCardListing => card != null);

  const deferredIds = new Set(deferred.map((listing) => listing.external_id));

  for (const card of selectedCards) {
    const detail =
      (detailFetcher ? await detailFetcher(card) : undefined) ??
      resolveDetailBody(card, fixtureDetailBodies);
    const enriched = enrichFacebookCard(card, postedAt, detail);
    if (enriched.ok) {
      rawListings.push(enriched.listing);
    } else {
      enrichRejected += 1;
    }
  }

  for (const card of workQueue) {
    if (selectedCards.some((selectedCard) => selectedCard.external_id === card.external_id)) {
      continue;
    }
    if (deferredIds.has(card.external_id)) {
      continue;
    }
    const enriched = enrichFacebookCard(card, postedAt, resolveDetailBody(card, fixtureDetailBodies));
    if (enriched.ok) {
      rawListings.push(enriched.listing);
    } else {
      enrichRejected += 1;
    }
  }

  if (deferred.length > 0) {
    console.log(
      JSON.stringify({
        event: 'facebook_detail_cap_deferred',
        deferred: deferred.length,
        budget: detailBudget,
        listings_seen: listingsSeen,
      }),
    );
  }

  return { rawListings, detailCapDeferred: deferred.length, enrichRejected };
}

async function runFixtureCrawler(
  categoryUrls: readonly string[],
  fixtureBodies: ReadonlyMap<string, string>,
  crawlMode: CrawlMode,
  knownMap: Map<string, string>,
  earlyStopK: number,
  isFullRefresh: boolean,
  fixtureDetailBodies?: ReadonlyMap<string, string>,
): Promise<CrawlResult> {
  const urlStats = initUrlStats(categoryUrls);
  const completenessSamples: number[] = [];
  const postedAt = new Date().toISOString();
  let listingsSkippedAtCrawl = 0;
  const pendingWork: FacebookCardListing[] = [];
  const pendingTouch: FacebookCardListing[] = [];

  for (const url of categoryUrls) {
    const body = fixtureBodies.get(url) ?? loadFixtureSearchGraphql();
    const result = processCategoryGraphql(body, url, knownMap, earlyStopK, isFullRefresh);
    completenessSamples.push(result.jsonFieldCompleteness);
    listingsSkippedAtCrawl += result.listingsSkippedAtCrawl;
    pendingWork.push(...result.workQueue);
    pendingTouch.push(...result.touchCandidates);
    recordCategorySuccess(urlStats, url, result, result.workQueue.length + result.touchCandidates.length);
  }

  const { rawListings, detailCapDeferred, enrichRejected } = await finalizeWorkQueues(
    pendingWork,
    pendingTouch,
    postedAt,
    fixtureDetailBodies,
  );
  listingsSkippedAtCrawl += enrichRejected;

  const jsonFieldCompleteness =
    completenessSamples.length === 0
      ? 0
      : completenessSamples.reduce((a, b) => a + b, 0) / completenessSamples.length;

  return {
    rawListings: dedupeRawListings(rawListings),
    selectorHitRate: jsonFieldCompleteness,
    httpRequests: 0,
    listingsSkippedAtCrawl,
    jsonFieldCompleteness,
    blockedUrlCount: 0,
    detailCapDeferred,
    crawlMode,
    urlBreakdown: [...urlStats.values()],
  };
}

/**
 * Facebook Playwright crawler — GraphQL intercept, incremental early-stop, pickup gate (D-18-13/18).
 * Concurrency 1; page 1 only; detail visits capped at ~10% (D-18-16).
 */
export async function runFacebookCrawler(
  categoryUrls: readonly string[],
  preset: AntiBlockPreset = 'conservative',
  proxyUrlOverride?: string,
  options: RunFacebookCrawlerOptions = { session: { cookies: [] } },
): Promise<CrawlResult> {
  const knownMap = options.knownMap ?? new Map<string, string>();
  const earlyStopK = options.earlyStopK ?? 5;
  const isFullRefresh = options.isFullRefresh ?? false;
  const crawlMode = options.mode ?? (isFullRefresh ? 'full' : 'incremental');
  const fixtureBodies = options.fixtureGraphqlBodies;

  if (fixtureBodies) {
    return runFixtureCrawler(
      categoryUrls,
      fixtureBodies,
      crawlMode,
      knownMap,
      earlyStopK,
      isFullRefresh,
      options.fixtureDetailBodies,
    );
  }

  if (!proxyUrlOverride) {
    throw new Error('Facebook crawl requires residential proxy (D-18-08)');
  }

  const crawleeOpts = presetToCrawleeOptions(preset);
  const proxyConfiguration = new ProxyConfiguration({ proxyUrls: [proxyUrlOverride] });
  const urlStats = initUrlStats(categoryUrls);
  let listingsSkippedAtCrawl = 0;
  let blockedUrlCount = 0;
  const completenessSamples: number[] = [];
  const postedAt = new Date().toISOString();
  const pendingWork: FacebookCardListing[] = [];
  const pendingTouch: FacebookCardListing[] = [];
  const detailBodiesByUrl = new Map<string, string>();

  const searchQueue = await openRunRequestQueue(options.runId);
  try {
    const searchCrawler = new PlaywrightCrawler({
      requestQueue: searchQueue,
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
            // Response body may be unavailable after navigation.
          }
        });

        await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        const finalUrl = page.url();
        if (/\/login\/?(\?|$)/i.test(finalUrl) || /checkpoint/i.test(finalUrl)) {
          blockedUrlCount += 1;
          const stats = urlStats.get(request.url);
          if (stats) stats.blocked = true;
          throw new Error('session_expired');
        }

        let parsedCount = 0;
        for (const body of capturedBodies) {
          try {
            const result = processCategoryGraphql(
              body,
              request.url,
              knownMap,
              earlyStopK,
              isFullRefresh,
            );
            completenessSamples.push(result.jsonFieldCompleteness);
            listingsSkippedAtCrawl += result.listingsSkippedAtCrawl;
            pendingWork.push(...result.workQueue);
            pendingTouch.push(...result.touchCandidates);
            parsedCount += result.workQueue.length + result.touchCandidates.length;
            recordCategorySuccess(urlStats, request.url, result, parsedCount);
          } catch {
            // Ignore unparsable GraphQL responses.
          }
        }
      },
    });

    await searchCrawler.run([...categoryUrls]);
  } finally {
    await dropRunRequestQueue(searchQueue);
  }

  const detailCandidates = pendingWork.filter((card) => cardNeedsDetailVisit(card));
  const detailBudget = detailBudgetCap(pendingWork.length + pendingTouch.length);
  const detailCards = detailCandidates.slice(0, detailBudget);

  if (detailCards.length > 0) {
    const detailQueue = await openRunRequestQueue(
      options.runId ? `${options.runId}-detail` : undefined,
    );
    try {
      const detailCrawler = new PlaywrightCrawler({
        requestQueue: detailQueue,
        proxyConfiguration,
        useSessionPool: true,
        persistCookiesPerSession: true,
        sessionPoolOptions: sessionPoolOptions(1),
        minConcurrency: 1,
        maxConcurrency: 1,
        maxRequestsPerCrawl: detailCards.length,
        launchContext: { launchOptions: { headless: true } },
        async requestHandler({ page, request }) {
          await applySessionToContext(page.context(), options.session);
          const capturedBodies: string[] = [];
          page.on('response', async (response) => {
            if (!response.url().includes('/api/graphql')) return;
            try {
              capturedBodies.push(await response.text());
            } catch {
              // ignore
            }
          });
          await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(1500);
          detailBodiesByUrl.set(request.url, capturedBodies[0] ?? '');
        },
      });

      await detailCrawler.run(detailCards.map((card) => card.external_url));
    } finally {
      await dropRunRequestQueue(detailQueue);
    }
  }

  const detailFetcher = async (card: FacebookCardListing): Promise<FacebookDetailFields | undefined> => {
    const body = detailBodiesByUrl.get(card.external_url);
    if (!body) return undefined;
    try {
      return parseFacebookDetailFragment(JSON.parse(body));
    } catch {
      return undefined;
    }
  };

  const { rawListings, detailCapDeferred, enrichRejected } = await finalizeWorkQueues(
    pendingWork,
    pendingTouch,
    postedAt,
    undefined,
    detailFetcher,
  );
  listingsSkippedAtCrawl += enrichRejected;

  const jsonFieldCompleteness =
    completenessSamples.length === 0
      ? 0
      : completenessSamples.reduce((a, b) => a + b, 0) / completenessSamples.length;

  return {
    rawListings: dedupeRawListings(rawListings),
    selectorHitRate: jsonFieldCompleteness,
    httpRequests: categoryUrls.length + detailCards.length,
    listingsSkippedAtCrawl,
    jsonFieldCompleteness,
    blockedUrlCount,
    detailCapDeferred,
    crawlMode,
    urlBreakdown: [...urlStats.values()],
  };
}

export { cardNeedsDetailVisit, detailBudgetCap };
