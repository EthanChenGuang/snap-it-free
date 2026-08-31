import { normalizeSubitoFeedPhotoUrl } from '@/lib/listings/subito-photo-url';
import type { ListingRow } from '@/lib/listings/types';

const PRELOAD_COUNT = 4;

/** Hoisted to `<head>` by Next.js — warms CDN connections for above-the-fold feed photos. */
export function FeedImagePreloads({ listings }: { listings: ListingRow[] }) {
  return (
    <>
      {listings.slice(0, PRELOAD_COUNT).map((listing) => {
        if (!listing.photo_url) return null;
        return (
          <link
            key={listing.id}
            rel="preload"
            as="image"
            href={normalizeSubitoFeedPhotoUrl(listing.photo_url)}
          />
        );
      })}
    </>
  );
}
