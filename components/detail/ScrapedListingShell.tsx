'use client';

import { DetailActionCard } from '@/components/detail/DetailActionCard';
import { DetailArticle } from '@/components/detail/DetailArticle';
import { DetailFooter } from '@/components/detail/DetailFooter';
import { DetailLocationBlock } from '@/components/detail/DetailLocationBlock';
import { DetailSourceIdentity } from '@/components/detail/DetailSourceIdentity';
import { DetailTopBar } from '@/components/detail/DetailTopBar';
import { HeroMetadata } from '@/components/detail/HeroMetadata';
import { SimilarListings } from '@/components/detail/SimilarListings';
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
    <div className="flex h-full flex-col overflow-y-auto bg-surface">
      <DetailTopBar listing={listing} />

      <main className="mx-auto w-full max-w-container-max px-gutter py-space-xl pb-32">
        <div className="grid grid-cols-1 gap-space-xl lg:grid-cols-12">
          <div className="flex flex-col gap-space-lg lg:col-span-8">
            <HeroMetadata listing={listing} />
            <DetailArticle isUgc={false} />
          </div>

          <aside className="flex flex-col gap-space-lg lg:col-span-4">
            <DetailActionCard
              isAvailable={isAvailable}
              isUgc={false}
              onClaim={handleClaim}
              onMessage={handleClaim}
              claimDisabled={!canOpenExternal}
              messageDisabled={!canOpenExternal}
            />
            <DetailSourceIdentity listing={listing} />
            <DetailLocationBlock listing={listing} />
            <SimilarListings listings={similarListings} />
          </aside>
        </div>
        <DetailFooter />
      </main>
    </div>
  );
}
