import { haversineKm } from '@/lib/geo/haversine';
import type { ListingRow, VeniceZone, ZoneChip } from './types';

export type ConsumerCity = 'all' | 'venice' | 'padova';

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
export function listingConsumerCity(listing: ListingRow): 'venice' | 'padova' | null {
  if (
    listing.zone === 'centro_storico' ||
    listing.zone === 'mestre_marghera' ||
    listing.zone === 'lido_murano'
  ) {
    return 'venice';
  }
  if (listing.city?.toLowerCase() === 'padova') return 'padova';
  return null;
}

export function matchesConsumerCity(listing: ListingRow, city: ConsumerCity): boolean {
  if (city === 'all') return true;
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
