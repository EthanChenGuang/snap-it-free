export type CrawlMode = 'incremental' | 'full';

export function validateBatch(
  listings: unknown[],
  trailingMedians: number[],
  selectorHitRate: number,
  minCountRatio = 0.5,
  minSelectorRate = 0.9,
  geoResolutionRate?: number,
  minGeoResolutionRate?: number,
): { ok: true } | { ok: false; reason: string } {
  const median = trailingMedians.length
    ? trailingMedians.reduce((a, b) => a + b, 0) / trailingMedians.length
    : 50;

  const minCount = Math.floor(median * minCountRatio);

  if (listings.length < minCount) {
    return {
      ok: false,
      reason: `count ${listings.length} < min ${minCount} (${Math.round(minCountRatio * 100)}% of median ${median})`,
    };
  }

  if (selectorHitRate < minSelectorRate) {
    return {
      ok: false,
      reason: `selector hit rate ${selectorHitRate} < ${minSelectorRate}`,
    };
  }

  if (
    typeof geoResolutionRate === 'number' &&
    typeof minGeoResolutionRate === 'number' &&
    geoResolutionRate < minGeoResolutionRate
  ) {
    return {
      ok: false,
      reason: `geo resolution rate ${geoResolutionRate.toFixed(2)} < ${minGeoResolutionRate}`,
    };
  }

  return { ok: true };
}

/** ADR 015 thresholds — JSON completeness gate for HttpCrawler path (D-15-26, SCRP-E08). */
export const JSON_FIELD_COMPLETENESS_MIN = 0.9;
export const MIN_COUNT_RATIO_FULL = 0.5;
export const MIN_COUNT_RATIO_INCREMENTAL = 0.2;
/**
 * Vinted €0 listings are sparse on vinted.it (17-RESEARCH) — incremental count floor
 * near zero so validation does not fail healthy incremental runs (SCRP-E08).
 */
export const VINTED_MIN_COUNT_RATIO_INCREMENTAL = 0;
export const VINTED_MIN_COUNT_RATIO_FULL = 0.2;
/**
 * Facebook free listings are sparse on marketplace search (18-RESEARCH) —
 * incremental count floor near zero so validation does not fail healthy runs (SCRP-E08).
 */
export const FACEBOOK_MIN_COUNT_RATIO_INCREMENTAL = 0;
export const FACEBOOK_MIN_COUNT_RATIO_FULL = 0.2;
/**
 * Wallapop €0 listings may be sparse (D-25-02 spike-gated) — same floor as Vinted/Facebook.
 */
export const WALLAPOP_MIN_COUNT_RATIO_INCREMENTAL = 0;
export const WALLAPOP_MIN_COUNT_RATIO_FULL = 0.2;

export type ValidateBatchHttpParams = {
  listings: unknown[];
  trailingMedians: number[];
  jsonFieldCompleteness: number;
  crawlMode: CrawlMode;
  listingsSkippedAtCrawl: number;
  minCompleteness?: number;
  minCountRatioFull?: number;
  minCountRatioIncremental?: number;
  geoResolutionRate?: number;
  minGeoResolutionRate?: number;
  /** When every URL was blocked and nothing parsed, surface block rate — not completeness 0. */
  blockedUrlCount?: number;
  totalUrlCount?: number;
};

export function validateBatchHttp(
  params: ValidateBatchHttpParams,
): { ok: true } | { ok: false; reason: string } {
  const minCompleteness = params.minCompleteness ?? JSON_FIELD_COMPLETENESS_MIN;
  const minCountRatioFull = params.minCountRatioFull ?? MIN_COUNT_RATIO_FULL;
  const minCountRatioIncremental =
    params.minCountRatioIncremental ?? MIN_COUNT_RATIO_INCREMENTAL;

  const totalUrls = params.totalUrlCount ?? 0;
  const blockedUrls = params.blockedUrlCount ?? 0;
  if (
    totalUrls > 0 &&
    blockedUrls >= totalUrls &&
    params.listings.length === 0
  ) {
    return {
      ok: false,
      reason: `${blockedUrls}/${totalUrls} category URLs blocked (no listings extracted)`,
    };
  }

  if (params.jsonFieldCompleteness < minCompleteness) {
    return {
      ok: false,
      reason: `json field completeness ${params.jsonFieldCompleteness.toFixed(3)} < ${minCompleteness}`,
    };
  }

  const median = params.trailingMedians.length
    ? params.trailingMedians.reduce((a, b) => a + b, 0) / params.trailingMedians.length
    : 50;

  const minCountRatio =
    params.crawlMode === 'full' ? minCountRatioFull : minCountRatioIncremental;
  const minCount = Math.floor(median * minCountRatio);

  const incrementalEscape =
    params.crawlMode === 'incremental' &&
    params.listingsSkippedAtCrawl > 0 &&
    params.jsonFieldCompleteness >= minCompleteness;

  if (params.listings.length < minCount && !incrementalEscape) {
    return {
      ok: false,
      reason: `count ${params.listings.length} < min ${minCount} (${Math.round(minCountRatio * 100)}% of median ${median})`,
    };
  }

  if (
    typeof params.geoResolutionRate === 'number' &&
    typeof params.minGeoResolutionRate === 'number' &&
    params.geoResolutionRate < params.minGeoResolutionRate
  ) {
    return {
      ok: false,
      reason: `geo resolution rate ${params.geoResolutionRate.toFixed(2)} < ${params.minGeoResolutionRate}`,
    };
  }

  return { ok: true };
}
