'use client';

import { ContactAssistantSheet } from '@/components/detail/ContactAssistantSheet';
import { DetailPreviewWall } from '@/components/detail/DetailPreviewWall';
import { ListingDetailSkeleton } from '@/components/detail/ListingDetailSkeleton';
import { ListingDetailContent } from '@/components/detail/ListingDetailContent';
import { useState } from 'react';
import { buildAuthRedirectPath } from '@/lib/auth/build-auth-redirect';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { isAllowedExternalUrl, openExternalListingUrl } from '@/lib/listings/external-url';
import { shouldUseContactAssistant } from '@/lib/contact/templates';
import { useMessages } from '@/lib/i18n/useMessages';
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
  const { language } = useMessages();
  const [contactOpen, setContactOpen] = useState(false);

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

    const useAssistant = shouldUseContactAssistant({ language, source: listing.source });

    const handleClaim = () => {
      if (!canOpenExternal) return;
      if (useAssistant) {
        setContactOpen(true);
        return;
      }
      openExternalListingUrl(listing.external_url);
    };

    return (
      <>
        <ListingDetailContent
          listing={listing}
          similarListings={similarListings}
          isAvailable={isAvailable}
          onPrimaryAction={handleClaim}
          primaryDisabled={!canOpenExternal}
        />
        {useAssistant && (
          <ContactAssistantSheet open={contactOpen} onOpenChange={setContactOpen} listing={listing} />
        )}
      </>
    );
  }

  return (
    <div className="h-full min-h-0">
      <DetailPreviewWall listing={listing} redirectTo={redirectTo} />
    </div>
  );
}
