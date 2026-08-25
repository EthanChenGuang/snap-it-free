import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import { getCityByConsumerKey, getCityBySubitoSlug, inCityBbox } from '@/lib/geo/italian-cities';
import { haversineKm } from '@/lib/geo/haversine';
import type { ListingRow, VeniceZone, ZoneChip } from './types';

export type ConsumerCity = 'all' | 'other' | ConsumerCityKey;

/** Filter chip order by Chinese-resident population in Italy; unranked cities before `other`. */
export const CONSUMER_CITY_FILTER_ORDER: readonly ConsumerCityKey[] = [
  'milano',
  'roma',
  'prato',
  'torino',
  'firenze',
  'bologna',
  'napoli',
  'brescia',
  'venice',
  'genova',
  'padova',
  'perugia',
  'verona',
];

export const CONSUMER_CITY_FILTER_OPTIONS: readonly ConsumerCity[] = [
  'all',
  ...CONSUMER_CITY_FILTER_ORDER,
  'other',
];

export function filterByZone(listings: ListingRow[], zoneChip: ZoneChip): ListingRow[] {
  if (zoneChip === 'All') {
    return listings.filter(
      (listing) =>
        listing.zone != null ||
        (listing.zone == null && listing.lat != null && listing.lng != null),
    );
  }

  return listings.filter((listing) => listing.zone === zoneChip);
}

export function filterMapListings(listings: ListingRow[]): ListingRow[] {
  return listings.filter((listing) => listing.lat != null && listing.lng != null);
}

export function isVeniceZone(value: string): value is VeniceZone {
  return value === 'centro_storico' || value === 'mestre_marghera' || value === 'lido_murano';
}

export function excludeReportedIds(listings: ListingRow[], reportedIds: string[]): ListingRow[] {
  if (reportedIds.length === 0) {
    return listings;
  }
  const reported = new Set(reportedIds);
  return listings.filter((listing) => !reported.has(listing.id));
}

/** Map DB zone/city fields to consumer city filter (D-02, D-34). */
export function listingConsumerCity(listing: ListingRow): ConsumerCityKey | null {
  if (
    listing.zone === 'centro_storico' ||
    listing.zone === 'mestre_marghera' ||
    listing.zone === 'lido_murano'
  ) {
    return 'venice';
  }

  const dbCity = listing.city?.toLowerCase();
  if (dbCity) {
    const entry = getCityBySubitoSlug(dbCity) ?? getCityByConsumerKey(dbCity);
    if (entry) {
      if (
        listing.lat != null &&
        listing.lng != null &&
        !inCityBbox(listing.lat, listing.lng, entry.subitoSlug)
      ) {
        return null;
      }
      return entry.consumerKey;
    }
  }

  return null;
}

export function matchesConsumerCity(listing: ListingRow, city: ConsumerCity): boolean {
  if (city === 'all') return true;
  if (city === 'other') return listingConsumerCity(listing) === null;
  return listingConsumerCity(listing) === city;
}

export function hasValidCoords(listing: ListingRow): boolean {
  return listing.lat != null && listing.lng != null;
}

export function filterByRadiusKm(
  listings: ListingRow[],
  center: { lat: number; lng: number },
  radiusKm: number,
): ListingRow[] {
  return listings.filter((listing) => {
    if (!hasValidCoords(listing)) return false;
    const km = haversineKm(center, { lat: listing.lat!, lng: listing.lng! });
    return km <= radiusKm;
  });
}

export function sortByDistance(
  listings: ListingRow[],
  center: { lat: number; lng: number },
): ListingRow[] {
  return [...listings].sort((a, b) => {
    const aKm = hasValidCoords(a)
      ? haversineKm(center, { lat: a.lat!, lng: a.lng! })
      : Infinity;
    const bKm = hasValidCoords(b)
      ? haversineKm(center, { lat: b.lat!, lng: b.lng! })
      : Infinity;
    return aKm - bKm;
  });
}

export function sortByPostedAtDesc(listings: ListingRow[]): ListingRow[] {
  return [...listings].sort(
    (a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime(),
  );
}

/** Newest first; when posted_at ties, nearest to center wins (listings without coords last). */
export function sortByPostedAtDescThenDistance(
  listings: ListingRow[],
  center: { lat: number; lng: number } | null,
): ListingRow[] {
  return [...listings].sort((a, b) => {
    const timeDiff = new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
    if (timeDiff !== 0) return timeDiff;
    if (!center) return 0;

    const aKm = hasValidCoords(a)
      ? haversineKm(center, { lat: a.lat!, lng: a.lng! })
      : Infinity;
    const bKm = hasValidCoords(b)
      ? haversineKm(center, { lat: b.lat!, lng: b.lng! })
      : Infinity;
    return aKm - bKm;
  });
}
