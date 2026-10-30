import { FavoritesPageClient } from '@/components/listings/FavoritesPageClient';
import { LockedPanel } from '@/components/onboarding/LockedViews';
import { getListingAccess } from '@/lib/paywall/server-access';

// No searchParams here: reading them would make this static page dynamic even with the flag off.
export default async function FavoritesPage() {
  if ((await getListingAccess()) === 'locked') {
    return <LockedPanel variant="favorites" />;
  }
  return <FavoritesPageClient />;
}
