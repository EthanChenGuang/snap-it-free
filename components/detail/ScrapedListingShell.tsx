'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { DetailPreviewWall } from '@/components/detail/DetailPreviewWall';
import { ListingDetailContent } from '@/components/detail/ListingDetailContent';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { isAllowedExternalUrl, openExternalListingUrl } from '@/lib/listings/external-url';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type ScrapedListingShellProps = {
  listing: ListingRow;
  similarListings: ListingRow[];
};

function buildAuthRedirectPath(pathname: string, searchParamsString: string): string {
  const path =
    pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/';
  const query = searchParamsString.replace(/^\?/, '').trim();
  if (!query) return path;
  return `${path}?${query}`;
}

export function ScrapedListingShell({ listing, similarListings }: ScrapedListingShellProps) {
  const { user, loading } = useAuthSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { messages } = useMessages();
  const [authOpen, setAuthOpen] = useState(false);

  const redirectTo = buildAuthRedirectPath(pathname, searchParams.toString());

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

  return (
    <>
      <DetailPreviewWall
        listing={listing}
        loading={loading}
        onSignIn={() => setAuthOpen(true)}
      />
      <AuthPromptModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        redirectTo={redirectTo}
        modalTitle={messages.auth.detailTitle}
      />
    </>
  );
}
