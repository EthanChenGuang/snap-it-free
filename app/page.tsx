import { MapExplorer } from '@/components/map/MapExplorer';
import { getActiveListings } from '@/lib/listings/queries';

export const dynamic = 'force-dynamic';

export default async function MapHomePage() {
  const listings = await getActiveListings();
  return <MapExplorer initialListings={listings} />;
}
