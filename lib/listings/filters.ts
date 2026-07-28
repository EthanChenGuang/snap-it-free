import type { ListingRow, VeniceZone, ZoneChip } from './types';

export function filterByZone(listings: ListingRow[], zoneChip: ZoneChip): ListingRow[] {
  if (zoneChip === 'All') {
    return listings.filter((listing) => listing.zone != null);
  }

  return listings.filter((listing) => listing.zone === zoneChip);
}

export function filterMapListings(listings: ListingRow[]): ListingRow[] {
  return listings.filter((listing) => listing.lat != null && listing.lng != null);
}

export function isVeniceZone(value: string): value is VeniceZone {
  return value === 'centro_storico' || value === 'mestre_marghera' || value === 'lido_murano';
}
