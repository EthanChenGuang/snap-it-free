import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import {
  resolveListingDescription,
  resolveListingTitle,
} from '@/lib/i18n/listing-fields';
import { getCityBySubitoSlug } from '@/lib/geo/italian-cities';
import { listingConsumerCity } from '@/lib/listings/filters';
import type { AppLanguage } from '@/lib/settings/preferences';
import type { ListingRow } from './types';

export type ConsumerCityLabels = Record<ConsumerCityKey, string>;

/** City-only consumer location label — never zone subdivisions (D-38). */
export function listingConsumerCityLabel(
  listing: ListingRow,
  cityLabels: ConsumerCityLabels,
): string {
  const city = listingConsumerCity(listing);
  if (city && cityLabels[city]) return cityLabels[city];
  if (listing.city) {
    const entry = getCityBySubitoSlug(listing.city);
    if (entry && cityLabels[entry.consumerKey]) return cityLabels[entry.consumerKey];
    return listing.city.charAt(0).toUpperCase() + listing.city.slice(1);
  }
  return '';
}

/** Consumer-facing location line — city name only, not Venice sub-zones. */
export function listingConsumerLocationLabel(
  listing: ListingRow,
  cityLabels: ConsumerCityLabels,
  approximateZoneLabel: string,
): string {
  const cityLabel = listingConsumerCityLabel(listing, cityLabels);
  if (cityLabel) return cityLabel;
  return approximateZoneLabel;
}

/**
 * Client-side feed search matcher (D-06): title + description + city label.
 */
export function matchesFeedSearch(
  listing: ListingRow,
  query: string,
  locale: AppLanguage,
  cityLabels: ConsumerCityLabels,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const title = resolveListingTitle(listing, locale).toLowerCase();
  const location = listingConsumerCityLabel(listing, cityLabels).toLowerCase();
  const description = (resolveListingDescription(listing, locale) ?? '').toLowerCase();

  return title.includes(q) || location.includes(q) || description.includes(q);
}
