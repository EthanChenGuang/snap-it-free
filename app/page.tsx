import { FeedHomeClient } from '@/components/listings/FeedHomeClient';
import { FeedImagePreloads } from '@/components/listings/FeedImagePreloads';
import { LockedFeed } from '@/components/onboarding/LockedViews';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import {
  FEED_SSR_LISTING_LIMIT,
  getActiveListings,
  getActiveListingsCount,
} from '@/lib/listings/queries';
import type { ListingRow } from '@/lib/listings/types';
import { lockedPreviewPhotos } from '@/lib/paywall/locked-preview';
import { getListingAccess } from '@/lib/paywall/server-access';

export const dynamic = 'force-dynamic';

type FeedHomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FeedHomePage({ searchParams }: FeedHomePageProps) {
  const access = await getListingAccess(await searchParams);

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

  if (access === 'locked') {
    return (
      <>
        <LockedFeed count={totalCount} photos={lockedPreviewPhotos(listings)} />
        <OnboardingGate />
      </>
    );
  }

  return (
    <>
      <FeedImagePreloads listings={listings} />
      <FeedHomeClient initialListings={listings} initialTotalCount={totalCount} />
      <OnboardingGate />
    </>
  );
}
