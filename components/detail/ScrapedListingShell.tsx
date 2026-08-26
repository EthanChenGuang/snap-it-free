'use client';

import { DetailPreviewWall } from '@/components/detail/DetailPreviewWall';
import { ListingDetailSkeleton } from '@/components/detail/ListingDetailSkeleton';
import { ListingDetailContent } from '@/components/detail/ListingDetailContent';
import { buildAuthRedirectPath } from '@/lib/auth/build-auth-redirect';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { isAllowedExternalUrl, openExternalListingUrl } from '@/lib/listings/external-url';
import type { ListingRow } from '@/lib/listings/types';

type ScrapedListingShellProps = {
  listing: ListingRow;
  similarListings: ListingRow[];
  searchParamsString?: string;
};

export function ScrapedListingShell({
  listing,
  similarListings,
  searchParamsString = '',
}: ScrapedListingShellProps) {
  const { user, loading } = useAuthSession();

  const redirectTo = buildAuthRedirectPath(
    `/listing/${listing.id}`,
    searchParamsString,
  );

  if (loading) {
    return <ListingDetailSkeleton />;
  }

  if (user) {
    const canOpenExternal = isAllowedExternalUrl(listing.external_url);
    const isAvailable = listing.status === 'active';

    const handleClaim = () => {
      if (canOpenExternal) {
        openExternalListingUrl(listing.external_url);
      }
    };

    return (
      <ListingDetailContent
        listing={listing}
        similarListings={similarListings}
        isAvailable={isAvailable}
        onPrimaryAction={handleClaim}
        primaryDisabled={!canOpenExternal}
      />
    );
  }

  return <DetailPreviewWall listing={listing} redirectTo={redirectTo} />;
}
