'use client';

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
import { cn } from '@/lib/utils';

type ListingDetailContentProps = {
  listing: ListingRow;
  similarListings: ListingRow[];
  isUgc?: boolean;
  isAvailable: boolean;
  onPrimaryAction: () => void;
  primaryDisabled?: boolean;
  /** Owner lifecycle controls replace the sticky CTA when set. */
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
    <div className="flex h-full flex-col overflow-y-auto bg-surface">
      <div className="relative mx-auto w-full max-w-container-max">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container-low md:aspect-[16/10] md:rounded-b-lg">
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

        <div className="relative -mt-5 rounded-t-2xl border border-outline-variant bg-surface-container-lowest px-gutter pb-28 pt-space-lg md:-mt-6">
          {banner}

          <div className="mx-auto max-w-lg text-center">
            <h1 className="text-h2 font-bold leading-tight text-on-surface">{displayTitle}</h1>

            <p
              className="mt-space-sm text-body-md text-secondary"
              suppressHydrationWarning
            >
              {metadataLine}
            </p>
          </div>

          <div className="mx-auto my-space-lg max-w-lg border-t border-outline-variant" />

          <div className="mx-auto max-w-lg">
            <DetailArticle listing={listing} isUgc={isUgc} />

            <p className="mt-space-md text-center text-h3 font-semibold text-primary">
              {messages.detail.costFreeLabel}
            </p>

            {pickupHint && (
              <p className="mt-space-sm text-center text-body-md text-on-surface-variant">
                {pickupHint}
              </p>
            )}

            {isAvailable && !isUgc && (
              <p className="mt-space-sm text-center text-label-md font-medium text-on-surface">
                {messages.detail.fcfsNote}
              </p>
            )}

            {!isAvailable && (
              <p className="mt-space-md text-center text-label-md font-medium text-secondary">
                {messages.listing.claimed}
              </p>
            )}

            {lifecycleActions && (
              <div className="mt-space-lg border-t border-outline-variant pt-space-lg">
                {lifecycleActions}
              </div>
            )}
          </div>

          <div className="mx-auto mt-space-xl max-w-lg">
            <SimilarListings listings={similarListings} />
          </div>
        </div>
      </div>

      {showStickyCta && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface-container-lowest px-gutter py-space-md pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
          <div className="mx-auto max-w-container-max">
            {isAvailable ? (
              <Button
                type="button"
                className={cn(
                  'flex w-full items-center justify-center py-space-md text-label-md font-semibold',
                )}
                disabled={primaryDisabled}
                onClick={onPrimaryAction}
              >
                {ctaLabel}
              </Button>
            ) : (
              <button
                type="button"
                disabled
                className="flex w-full items-center justify-center border border-outline bg-surface-container py-space-md text-label-md font-medium text-secondary"
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
