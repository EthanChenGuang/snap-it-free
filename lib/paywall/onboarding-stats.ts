import { getCityByConsumerKey, type ConsumerCityKey } from '@/lib/geo/italian-cities';
import { listingConsumerCity } from '@/lib/listings/filters';
import type { ListingRow } from '@/lib/listings/types';

/**
 * Real figures for the Snag-shaped onboarding screens added in quick 261031-ob4 (weekly volume, map,
 * favourites). Everything is computed from the active rows the onboarding already loads; nothing is
 * invented. Pure so it can be unit tested without a browser.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function postedMs(row: ListingRow): number | null {
  const ms = new Date(row.posted_at).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Start of the local calendar day containing `ms`. */
function localDayStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type DailyCount = { dayStart: number; count: number };

/**
 * Items posted on each of the last 7 local calendar days, oldest first, today last. Rows posted in
 * the future (clock skew) count as today.
 */
export function dailyCountsLast7(rows: readonly ListingRow[], now: number): DailyCount[] {
  const today = localDayStart(now);
  const days: DailyCount[] = [];
  for (let back = 6; back >= 0; back -= 1) {
    // Step by calendar day (DST-safe): noon of the day `back` days ago, floored to its local midnight.
    days.push({ dayStart: localDayStart(today + DAY_MS / 2 - back * DAY_MS), count: 0 });
  }
  for (const row of rows) {
    const ms = postedMs(row);
    if (ms === null) continue;
    const start = localDayStart(Math.min(ms, now));
    const slot = days.find((day) => day.dayStart === start);
    if (slot) slot.count += 1;
  }
  return days;
}

/** Newest `posted_at` among the rows (ms), or null when none parse. Future stamps are clamped to now. */
export function newestPostedMs(rows: readonly ListingRow[], now: number): number | null {
  let newest: number | null = null;
  for (const row of rows) {
    const ms = postedMs(row);
    if (ms === null) continue;
    const clamped = Math.min(ms, now);
    if (newest === null || clamped > newest) newest = clamped;
  }
  return newest;
}

/** Distinct consumer cities that currently have at least one row. */
export function activeCityCount(rows: readonly ListingRow[]): number {
  const cities = new Set<ConsumerCityKey>();
  for (const row of rows) {
    const key = listingConsumerCity(row);
    if (key) cities.add(key);
  }
  return cities.size;
}

export type CityBubble = {
  city: ConsumerCityKey;
  /** Active rows whose city is this one. */
  count: number;
  /** The catalog city centre (bbox centre), [lng, lat]. */
  lngLat: readonly [number, number];
};

export type CityMap = { total: number; cities: CityBubble[] };

/**
 * The map screen at city level: every row sits at its city centre (Subito has no per-item
 * coordinates), so we show one bubble per city sized by its real active count, busiest first.
 * `total` is the sum of the counted rows.
 */
export function buildCityMap(rows: readonly ListingRow[]): CityMap | null {
  const counts = new Map<ConsumerCityKey, number>();
  for (const row of rows) {
    const key = listingConsumerCity(row);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const cities: CityBubble[] = [];
  for (const [city, count] of counts) {
    const entry = getCityByConsumerKey(city);
    if (!entry) continue;
    const { latMin, latMax, lngMin, lngMax } = entry.bbox;
    cities.push({ city, count, lngLat: [(lngMin + lngMax) / 2, (latMin + latMax) / 2] });
  }
  if (cities.length === 0) return null;
  cities.sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
  return { total: cities.reduce((sum, bubble) => sum + bubble.count, 0), cities };
}
