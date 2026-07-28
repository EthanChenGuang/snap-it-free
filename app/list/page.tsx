import { ListPageClient } from '@/components/listings/ListPageClient';
import { getActiveListings } from '@/lib/listings/queries';

export const dynamic = 'force-dynamic';

export default async function ListPage() {
  const listings = await getActiveListings();
  return <ListPageClient initialListings={listings} />;
}
