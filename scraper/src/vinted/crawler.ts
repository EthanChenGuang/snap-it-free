import { gotScraping } from 'got-scraping';
import type { AntiBlockPreset } from '../admin/presets.js';
import type { CrawlResult, RunSubitoCrawlerOptions } from '../subito/crawler.js';
import { catalogUrlToApiParams } from './catalog-api.js';
import { CategoryParseError, parseCatalogApiResponse, type VintedCatalogListing } from './http-extract.js';

type RunCrawlerLikeOptions = Pick<
  RunSubitoCrawlerOptions,
  'knownMap' | 'isFullRefresh' | 'proxyUrlOverride' | 'mode' | 'runId'
>;

const API_ORIGIN = 'https://www.vinted.it';
const CATALOG_ITEMS_ENDPOINT = '/api/v2/catalog/items';
const TLS_OPTIONS = {
  browsers: [{ name: 'chrome', minVersion: 120 }],
  devices: ['desktop'],
  locales: ['it-IT'],
};
const REQUEST_TIMEOUT_MS = 20000;

/**
 * Build a usable Cookie header from a got-scraping set-cookie response:
 * skip empty-value cookies (Vinted emits an empty access_token_web= pair before the
 * populated one) and dedupe by name — a naive join otherwise 401s (Wave 0 finding).
 */
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

async function fetchCatalogPage(
  url: string,
  proxyUrl?: string,
): Promise<string> {
  const res = await gotScraping({
    url,
    headerGeneratorOptions: TLS_OPTIONS,
    timeout: { request: REQUEST_TIMEOUT_MS },
    ...(proxyUrl ? { proxyUrl } : {}),
  });
  if (res.statusCode !== 200) {
    throw new CategoryParseError(`catalog page HTTP ${res.statusCode}`, 'missing_api_data');
  }
  const cookieHeader = buildCookieHeader(res.headers?.['set-cookie']);
  const body = typeof res.body === 'string' ? res.body : res.body.toString();

  const params = catalogUrlToApiParams(url).toString();
  const apiRes = await gotScraping({
    url: `${API_ORIGIN}${CATALOG_ITEMS_ENDPOINT}?${params}`,
    headerGeneratorOptions: TLS_OPTIONS,
    timeout: { request: REQUEST_TIMEOUT_MS },
    headers: {
      accept: 'application/json',
      referer: url,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    ...(proxyUrl ? { proxyUrl } : {}),
  });
  if (apiRes.statusCode !== 200) {
    throw new CategoryParseError(`catalog API HTTP ${apiRes.statusCode}`, 'missing_api_data');
  }
  return typeof apiRes.body === 'string' ? apiRes.body : apiRes.body.toString();
}

export async function runVintedCrawler(
  categoryUrls: readonly string[],
  preset: AntiBlockPreset = 'standard',
  proxyUrlOverride?: string,
  options: RunCrawlerLikeOptions = {},
): Promise<CrawlResult> {
  const crawlMode = options.mode ?? (options.isFullRefresh ? 'full' : 'incremental');
  const rawListings: VintedCatalogListing[] = [];
  const urlBreakdown: CrawlResult['urlBreakdown'] = [];
  let httpRequests = 0;
  let blockedUrlCount = 0;
  const completenessSamples: number[] = [];

  for (const url of categoryUrls) {
    try {
      const apiBody = await fetchCatalogPage(url, proxyUrlOverride);
      httpRequests += 2; // warm-up GET + API GET
      const { listings, jsonFieldCompleteness } = parseCatalogApiResponse(apiBody, url);
      completenessSamples.push(jsonFieldCompleteness);
      rawListings.push(...listings);
      urlBreakdown.push({
        url,
        listingsFound: listings.length,
        listingsSkippedAtCrawl: 0,
        blocked: false,
        earlyStopTriggered: false,
      });
    } catch (err) {
      blockedUrlCount += 1;
      urlBreakdown.push({
        url,
        listingsFound: 0,
        listingsSkippedAtCrawl: 0,
        blocked: true,
        earlyStopTriggered: false,
      });
      if (err instanceof CategoryParseError && err.reason === 'parse_error') {
        throw err; // malformed response is a hard failure, not a block
      }
    }
  }

  const jsonFieldCompleteness =
    completenessSamples.length > 0
      ? completenessSamples.reduce((a, b) => a + b, 0) / completenessSamples.length
      : 0;

  return {
    rawListings,
    selectorHitRate: jsonFieldCompleteness,
    httpRequests,
    listingsSkippedAtCrawl: 0,
    jsonFieldCompleteness,
    blockedUrlCount,
    detailCapDeferred: 0,
    crawlMode,
    urlBreakdown,
  } as CrawlResult;
}
