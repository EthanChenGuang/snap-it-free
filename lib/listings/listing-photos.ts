import type { ListingRow } from '@/lib/listings/types';

/** All displayable photo URLs — prefers photo_urls gallery, falls back to photo_url. */
export function listingPhotoUrls(listing: Pick<ListingRow, 'photo_url' | 'photo_urls'>): string[] {
  const fromGallery = listing.photo_urls?.filter(
    (url): url is string => typeof url === 'string' && url.trim().length > 0,
  );
  if (fromGallery && fromGallery.length > 0) {
    return fromGallery;
  }
  if (listing.photo_url?.trim()) {
    return [listing.photo_url];
  }
  return [];
}
