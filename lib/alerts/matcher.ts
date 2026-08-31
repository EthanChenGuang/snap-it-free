import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import { resolveAlertFields } from '@/lib/alerts/city-encoding';
import { listingConsumerCity } from '@/lib/listings/filters';
import type { ListingRow, VeniceZone } from '@/lib/listings/types';

export type AlertMatchInput = {
  keyword: string | null;
  zone: VeniceZone | null;
  city: ConsumerCityKey | null;
};

export type ListingMatchInput = Pick<ListingRow, 'title' | 'zone' | 'city' | 'lat' | 'lng'>;

/** Case-insensitive keyword substring + city or legacy zone; AND when multiple set. */
export function alertMatchesListing(
  alert: AlertMatchInput,
  listing: ListingMatchInput,
): boolean {
  const resolved = resolveAlertFields({ keyword: alert.keyword, city: alert.city });

  const keywordOk =
    !resolved.keyword ||
    listing.title.toLowerCase().includes(resolved.keyword.toLowerCase());

  let locationOk = true;
  if (resolved.city) {
    locationOk = listingConsumerCity(listing as ListingRow) === resolved.city;
  } else if (alert.zone) {
    locationOk = alert.zone === listing.zone;
  }

  return keywordOk && locationOk;
}
