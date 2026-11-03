import { listingPhotoUrls } from '@/lib/listings/listing-photos';
import type { ListingRow } from '@/lib/listings/types';

/** The only listing data a locked page sends to the browser: an id and one photo URL. */
export type LockedPreviewPhoto = { id: string; photoUrl: string };

export const LOCKED_PREVIEW_PHOTO_LIMIT = 6;

export function lockedPreviewPhotos(
  listings: readonly ListingRow[],
  limit = LOCKED_PREVIEW_PHOTO_LIMIT,
): LockedPreviewPhoto[] {
  const photos: LockedPreviewPhoto[] = [];
  for (const listing of listings) {
    if (photos.length >= limit) break;
    const photoUrl = listingPhotoUrls(listing)[0];
    if (photoUrl) photos.push({ id: listing.id, photoUrl });
  }
  return photos;
}
