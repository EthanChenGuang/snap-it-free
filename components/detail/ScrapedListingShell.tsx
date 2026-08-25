'use client';

import { DetailActionCard } from '@/components/detail/DetailActionCard';
import { ListingDetailContent } from '@/components/detail/ListingDetailContent';
import { isAllowedExternalUrl, openExternalListingUrl } from '@/lib/listings/external-url';
import type { ListingRow } from '@/lib/listings/types';

type ScrapedListingShellProps = {
  listing: ListingRow;
  similarListings: ListingRow[];
};

export function ScrapedListingShell({ listing, similarListings }: ScrapedListingShellProps) {
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
