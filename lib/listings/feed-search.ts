import {
  resolveListingDescription,
  resolveListingTitle,
} from '@/lib/i18n/listing-fields';
import type { AppLanguage } from '@/lib/settings/preferences';
import type { ListingRow, VeniceZone } from './types';

function listingLocationLabel(
  listing: ListingRow,
  zoneLabel: (zone: VeniceZone) => string,
): string {
  if (listing.zone) {
    return zoneLabel(listing.zone);
  }
  if (listing.city) {
    return listing.city.charAt(0).toUpperCase() + listing.city.slice(1);
  }
  return '';
}

/**
 * Client-side feed search matcher (D-06): title + description + location label.
 */
export function matchesFeedSearch(
  listing: ListingRow,
  query: string,
  locale: AppLanguage,
  zoneLabel: (zone: VeniceZone) => string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const title = resolveListingTitle(listing, locale).toLowerCase();
  const location = listingLocationLabel(listing, zoneLabel).toLowerCase();
  const description = (resolveListingDescription(listing, locale) ?? '').toLowerCase();

  return title.includes(q) || location.includes(q) || description.includes(q);
}
