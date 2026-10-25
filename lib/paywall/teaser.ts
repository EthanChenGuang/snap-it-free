import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import { matchesConsumerCity } from '@/lib/listings/filters';
import { listingPhotoUrls } from '@/lib/listings/listing-photos';
import type { ListingRow } from '@/lib/listings/types';

export type CityTeaserThumbnail = {
  id: string;
  photoUrl: string;
  listing: ListingRow;
};

export type CityTeaser = {
  count: number;
  thumbnails: CityTeaserThumbnail[];
};

export const CITY_TEASER_THUMBNAIL_LIMIT = 4;

/** Same city predicate as the feed filter, so the count equals what browse shows for that city. */
export function summarizeCityTeaser(
  listings: readonly ListingRow[],
  city: ConsumerCityKey,
  limit = CITY_TEASER_THUMBNAIL_LIMIT,
): CityTeaser {
  const inCity = listings.filter((listing) => matchesConsumerCity(listing, city));
  const thumbnails: CityTeaserThumbnail[] = [];
  const seenPhotos = new Set<string>();
  for (const listing of inCity) {
    if (thumbnails.length >= limit) break;
    const photoUrl = listingPhotoUrls(listing)[0];
    // Subito reposts reuse one photo across listings; show distinct items.
    if (!photoUrl || seenPhotos.has(photoUrl)) continue;
    seenPhotos.add(photoUrl);
    thumbnails.push({ id: listing.id, photoUrl, listing });
  }
  return { count: inCity.length, thumbnails };
}
