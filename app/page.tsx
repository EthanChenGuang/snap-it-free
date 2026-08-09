import { FeedHomeClient } from '@/components/listings/FeedHomeClient';
import { getActiveListings } from '@/lib/listings/queries';
import type { ListingRow } from '@/lib/listings/types';

export const dynamic = 'force-dynamic';

export default async function FeedHomePage() {
  let listings: ListingRow[] = [];
  try {
    listings = await getActiveListings();
  } catch (error) {
    console.error('Failed to load listings for feed home:', error);
  }

  return <FeedHomeClient initialListings={listings} />;
}
