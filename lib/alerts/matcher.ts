import type { VeniceZone } from '@/lib/listings/types';

export type AlertMatchInput = {
  keyword: string | null;
  zone: VeniceZone | null;
};

export type ListingMatchInput = {
  title: string;
  zone: VeniceZone | null;
};

/** D-99: case-insensitive keyword substring + exact zone; AND when both set. */
export function alertMatchesListing(
  alert: AlertMatchInput,
  listing: ListingMatchInput,
): boolean {
  const keywordOk =
    !alert.keyword ||
    listing.title.toLowerCase().includes(alert.keyword.toLowerCase());
  const zoneOk = !alert.zone || alert.zone === listing.zone;
  return keywordOk && zoneOk;
}
