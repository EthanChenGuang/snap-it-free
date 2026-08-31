'use client';

import '@/app/listing-detail.css';
import Image from 'next/image';
import { DetailArticle } from '@/components/detail/DetailArticle';
import { DetailHeroControls } from '@/components/detail/DetailHeroControls';
import { SimilarListings } from '@/components/detail/SimilarListings';
import { Button } from '@/components/ui/button';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import {
  buildDetailMetadataLine,
  buildPickupHint,
  detailPrimaryCtaLabel,
} from '@/lib/listings/detail-metadata';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type ListingDetailContentProps = {
  listing: ListingRow;
  similarListings: ListingRow[];
  isUgc?: boolean;
  isAvailable: boolean;
  onPrimaryAction: () => void;
  primaryDisabled?: boolean;
  lifecycleActions?: React.ReactNode;
  banner?: React.ReactNode;
};

export function ListingDetailContent({
  listing,
  similarListings,
  isUgc = false,
  isAvailable,
  onPrimaryAction,
  primaryDisabled,
  lifecycleActions,
  banner,
}: ListingDetailContentProps) {
  const { language, messages, formatRelativeTime } = useMessages();
  const displayTitle = resolveListingTitle(listing, language);
  const postedLabel = formatRelativeTime(listing.posted_at);
  const metadataLine = buildDetailMetadataLine({
    listing,
    postedLabel,
    messages,
  });
  const pickupHint = buildPickupHint({ listing, messages });
  const ctaLabel = detailPrimaryCtaLabel({ source: listing.source, isUgc, messages });
  const showStickyCta = !lifecycleActions;

  return (
    <div className="listing-detail flex h-full flex-col overflow-y-auto bg-surface">
      <div className="relative mx-auto w-full max-w-container-max pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
        <div className="relative aspect-square w-full overflow-hidden bg-surface-container-low md:aspect-[4/3]">
          {listing.photo_url ? (
            <Image
              src={listing.photo_url}
              alt={displayTitle}
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl">image</span>
            </div>
          )}
          <DetailHeroControls listing={listing} />
        </div>

        <div className="px-gutter pt-space-lg">
          {banner}

          <header className="border-b border-outline-variant pb-space-md">
            <h1 className="text-h2 font-semibold leading-tight tracking-[-0.01em] text-on-surface">
              {displayTitle}
            </h1>
            <p
              className="mt-space-xs text-label-sm text-on-surface-variant"
              suppressHydrationWarning
            >
              {metadataLine}
            </p>
          </header>

          <section className="border-b border-outline-variant py-space-lg">
            <DetailArticle listing={listing} isUgc={isUgc} />
          </section>

          <section className="border-b border-outline-variant py-space-md">
            <p className="text-h3 font-semibold text-primary">{messages.detail.costFreeLabel}</p>
            {pickupHint && (
              <p className="mt-space-xs text-body-md text-on-surface-variant">{pickupHint}</p>
            )}
            {isAvailable && !isUgc && (
              <p className="mt-space-sm text-label-md font-medium text-on-surface">
                {messages.detail.fcfsNote}
              </p>
            )}
            {!isAvailable && (
              <p className="mt-space-sm text-label-md font-medium text-secondary">
                {messages.listing.claimed}
              </p>
            )}
          </section>

          {lifecycleActions && (
            <div className="border-b border-outline-variant py-space-lg">{lifecycleActions}</div>
          )}

          {similarListings.length > 0 && (
            <section className="pt-space-lg">
              <SimilarListings listings={similarListings} />
            </section>
          )}
        </div>
      </div>

      {showStickyCta && (
        <div className="listing-detail-sticky-bar">
          <div className="mx-auto max-w-container-max">
            {isAvailable ? (
              <Button
                type="button"
                className="flex min-h-11 w-full items-center justify-center py-space-md text-label-md font-semibold"
                disabled={primaryDisabled}
                onClick={onPrimaryAction}
              >
                {ctaLabel}
              </Button>
            ) : (
              <button
                type="button"
                disabled
                className="flex min-h-11 w-full items-center justify-center rounded border border-outline bg-surface-container py-space-md text-label-md font-medium text-secondary"
              >
                {messages.listing.claimed}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
