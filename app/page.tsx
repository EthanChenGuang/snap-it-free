import { FeedHomeClient } from '@/components/listings/FeedHomeClient';
import { FeedImagePreloads } from '@/components/listings/FeedImagePreloads';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
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
  try {
    [listings, totalCount] = await Promise.all([
      getActiveListings({ limit: FEED_SSR_LISTING_LIMIT }),
      getActiveListingsCount(),
    ]);
  } catch (error) {
    console.error('Failed to load listings for feed home:', error);
  }

  return (
    <>
      <FeedImagePreloads listings={listings} />
      <FeedHomeClient initialListings={listings} initialTotalCount={totalCount} />
      <OnboardingGate />
    </>
  );
}
