import { FeedHomeClient } from '@/components/listings/FeedHomeClient';
import { getActiveListings, getActiveListingsCount } from '@/lib/listings/queries';
import type { ListingRow } from '@/lib/listings/types';

export const dynamic = 'force-dynamic';

export default async function FeedHomePage() {
  let listings: ListingRow[] = [];
  let totalCount: number | null = null;
  try {
    [listings, totalCount] = await Promise.all([
      getActiveListings(),
      getActiveListingsCount(),
    ]);
  } catch (error) {
    console.error('Failed to load listings for feed home:', error);
  }

  return (
    <FeedHomeClient initialListings={listings} initialTotalCount={totalCount} />
  );
}
