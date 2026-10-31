import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import { listingConsumerCity } from '@/lib/listings/filters';
import { listingPhotoUrls } from '@/lib/listings/listing-photos';
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

export type MapPin = {
  id: string;
  /** 0–100, left to right. */
  x: number;
  /** 0–100, top to bottom (north up). */
  y: number;
  photoUrl: string;
  listing: ListingRow;
};

export type MapTeaser = { city: ConsumerCityKey; total: number; pins: MapPin[] };

function hasCoords(row: ListingRow): row is ListingRow & { lat: number; lng: number } {
  return typeof row.lat === 'number' && typeof row.lng === 'number' && Number.isFinite(row.lat) && Number.isFinite(row.lng);
}

/**
 * The map screen: the city with the most located rows, and up to `limit` of its newest rows with a
 * photo, placed by their real relative position (equirectangular, longitude scaled by cos(lat), fitted
 * into a padded box). `total` is every located row in that city, not just the pins drawn.
 */
export function buildMapTeaser(rows: readonly ListingRow[], limit = 12, padding = 10): MapTeaser | null {
  const byCity = new Map<ConsumerCityKey, Array<ListingRow & { lat: number; lng: number }>>();
  for (const row of rows) {
    if (!hasCoords(row)) continue;
    const key = listingConsumerCity(row);
    if (!key) continue;
    const list = byCity.get(key) ?? [];
    list.push(row);
    byCity.set(key, list);
  }
  let best: ConsumerCityKey | null = null;
  for (const [key, list] of byCity) {
    if (best === null || list.length > (byCity.get(best)?.length ?? 0)) best = key;
  }
  if (best === null) return null;
  const located = byCity.get(best) ?? [];

  const newest = [...located]
    .sort((a, b) => (postedMs(b) ?? 0) - (postedMs(a) ?? 0))
    .flatMap((row) => {
      const photoUrl = listingPhotoUrls(row)[0];
      return photoUrl ? [{ row, photoUrl }] : [];
    })
    .slice(0, limit);
  if (newest.length === 0) return null;

  const meanLat = newest.reduce((sum, { row }) => sum + row.lat, 0) / newest.length;
  const kx = Math.cos((meanLat * Math.PI) / 180);
  const xs = newest.map(({ row }) => row.lng * kx);
  const ys = newest.map(({ row }) => row.lat);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const inner = 100 - 2 * padding;
  // Keep the aspect: centre the shorter axis.
  const offX = (inner - ((maxX - minX) / span) * inner) / 2;
  const offY = (inner - ((maxY - minY) / span) * inner) / 2;

  const pins = newest.map(({ row, photoUrl }, index) => ({
    id: row.id,
    x: padding + offX + ((xs[index] - minX) / span) * inner,
    y: padding + offY + ((maxY - ys[index]) / span) * inner,
    photoUrl,
    listing: row,
  }));
  return { city: best, total: located.length, pins };
}
