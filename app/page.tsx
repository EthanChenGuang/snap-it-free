import { FeedHomeClient } from '@/components/listings/FeedHomeClient';
import { FeedImagePreloads } from '@/components/listings/FeedImagePreloads';
import { getFeaturedPicks } from '@/lib/featured/queries';
import type { FeaturedPick } from '@/lib/featured/types';
import {
  FEED_SSR_LISTING_LIMIT,
  getActiveListings,
  getActiveListingsCount,
} from '@/lib/listings/queries';
import type { ListingRow } from '@/lib/listings/types';

export const dynamic = 'force-dynamic';

export default async function FeedHomePage() {
  let listings: ListingRow[] = [];
  let totalCount: number | null = null;
  let featuredPicks: FeaturedPick[] = [];
  try {
    [listings, totalCount, featuredPicks] = await Promise.all([
      getActiveListings({ limit: FEED_SSR_LISTING_LIMIT }),
      getActiveListingsCount(),
      // Isolated: getFeaturedPicks never throws, and a rejection here must not drop the feed.
      getFeaturedPicks().catch(() => [] as FeaturedPick[]),
    ]);
  } catch (error) {
    console.error('Failed to load listings for feed home:', error);
  }

  return (
    <>
      <FeedImagePreloads listings={listings} />
      <FeedHomeClient
        initialListings={listings}
        initialTotalCount={totalCount}
        featuredPicks={featuredPicks}
      />
    </>
  );
}
