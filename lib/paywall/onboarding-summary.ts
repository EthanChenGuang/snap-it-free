import { getCityByConsumerKey, type ConsumerCityKey } from '@/lib/geo/italian-cities';
import { listingConsumerCity } from '@/lib/listings/filters';
import { listingPhotoUrls } from '@/lib/listings/listing-photos';
import type { ListingRow } from '@/lib/listings/types';
import { activeCityCount, buildCityMap, newestPostedMs, type CityMap } from '@/lib/paywall/onboarding-stats';

/**
 * Everything the onboarding needs from the live listings, aggregated on the server (Guang, 2026-11-08: the
 * weekly screen took ~5 s because every phone downloaded all ~40k rows). A few dozen KB instead of megabytes,
 * CDN-cached. Every number is still computed from the real rows; only where the work happens changed.
 */
export type OnboardingSummary = {
  generatedAt: number;
  venetoCount: number;
  /** posted_at (ms) of Veneto rows from the last 7 days; the phone buckets them by its own local days. */
  venetoRecentMs: number[];
  newestMs: number | null;
  /** Distinct cities with rows in the Veneto scope (the weekly screen's "3 cities"). */
  cityCount: number;
  map: CityMap | null;
  /** Newest distinct photos in the Veneto scope (preview/paywall fallback strip). */
  collage: string[];
  /** Per covered city and Subito category: real count and up to PHOTOS_PER_BUCKET newest distinct photos. */
  buckets: Record<string, Record<string, { count: number; photos: string[] }>>;
};

export const SUMMARY_COLUMNS = 'id, photo_url, photo_urls, lat, lng, zone, city, category, posted_at';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const COLLAGE_LIMIT = 6;
const PHOTOS_PER_BUCKET = 4;
const NO_CATEGORY = '_';

const VENETO_KEYS = new Set<ConsumerCityKey>(
  (['venice', 'padova', 'verona'] as ConsumerCityKey[]).filter((key) => getCityByConsumerKey(key)?.region === 'veneto'),
);

function postedMs(row: ListingRow): number | null {
  const ms = new Date(row.posted_at).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Rows must be newest first (the feed query order), so the first photos kept are the newest. */
export function buildOnboardingSummary(rows: readonly ListingRow[], now: number): OnboardingSummary {
  const veneto = rows.filter((row) => {
    const key = listingConsumerCity(row);
    return key !== null && VENETO_KEYS.has(key);
  });
  const scope = veneto.length > 0 ? veneto : rows;
  const cutoff = now - SEVEN_DAYS_MS;

  const collage: string[] = [];
  const seenCollage = new Set<string>();
  for (const row of scope) {
    if (collage.length >= COLLAGE_LIMIT) break;
    const url = listingPhotoUrls(row)[0];
    if (!url || seenCollage.has(url)) continue;
    seenCollage.add(url);
    collage.push(url);
  }

  const buckets: OnboardingSummary['buckets'] = {};
  for (const row of rows) {
    const city = listingConsumerCity(row);
    if (!city) continue;
    const category = row.category || NO_CATEGORY;
    const bucket = ((buckets[city] ??= {})[category] ??= { count: 0, photos: [] });
    bucket.count += 1;
    const url = listingPhotoUrls(row)[0];
    if (url && bucket.photos.length < PHOTOS_PER_BUCKET && !bucket.photos.includes(url)) bucket.photos.push(url);
  }

  return {
    generatedAt: now,
    venetoCount: veneto.length,
    venetoRecentMs: veneto.flatMap((row) => {
      const ms = postedMs(row);
      return ms !== null && ms >= cutoff ? [Math.min(ms, now)] : [];
    }),
    newestMs: newestPostedMs(scope, now),
    cityCount: activeCityCount(scope),
    map: buildCityMap(rows),
    collage,
    buckets,
  };
}

/**
 * Count and photos for a city ('all' = every covered city), narrowed to the given Subito categories
 * (empty = every category). Same numbers the full-row computation gave.
 */
export function cityTeaserFromSummary(
  summary: OnboardingSummary,
  city: ConsumerCityKey | 'all',
  categories: readonly string[],
  photoLimit = PHOTOS_PER_BUCKET,
): { count: number; photos: string[] } {
  const wanted = new Set(categories);
  const cityBuckets = city === 'all' ? Object.values(summary.buckets) : [summary.buckets[city] ?? {}];
  let count = 0;
  const lists: string[][] = [];
  for (const byCategory of cityBuckets) {
    for (const [category, bucket] of Object.entries(byCategory)) {
      if (wanted.size > 0 && !wanted.has(category)) continue;
      count += bucket.count;
      lists.push(bucket.photos);
    }
  }
  // Round-robin across buckets so the strip mixes categories/cities instead of showing one bucket.
  const photos: string[] = [];
  for (let i = 0; photos.length < photoLimit && lists.some((list) => i < list.length); i += 1) {
    for (const list of lists) {
      const url = list[i];
      if (url && !photos.includes(url)) photos.push(url);
      if (photos.length >= photoLimit) break;
    }
  }
  return { count, photos };
}
