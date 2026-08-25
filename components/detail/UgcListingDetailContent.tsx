'use client';

import Link from 'next/link';
import { DetailPhotoGallery } from '@/components/detail/DetailPhotoGallery';
import { SimilarListings } from '@/components/detail/SimilarListings';
import { Button } from '@/components/ui/button';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { buildDetailMetadataLine } from '@/lib/listings/detail-metadata';
import { listingPhotoUrls } from '@/lib/listings/listing-photos';
import type { ListingRow } from '@/lib/listings/types';
import {
  parseUgcDescriptionMeta,
  stripUgcDescriptionMeta,
} from '@/lib/ugc/description-meta';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type UgcListingDetailContentProps = {
  listing: ListingRow & { description?: string | null };
  similarListings: ListingRow[];
  isAvailable: boolean;
  isOwner: boolean;
  onContact: () => void;
  contactDisabled?: boolean;
  ownerFooter?: React.ReactNode;
  banner?: React.ReactNode;
  heroControls: React.ReactNode;
};

export function UgcListingDetailContent({
  listing,
  similarListings,
  isAvailable,
  isOwner,
  onContact,
  contactDisabled,
  ownerFooter,
  banner,
  heroControls,
}: UgcListingDetailContentProps) {
  const { language, messages, formatRelativeTime } = useMessages();
  const displayTitle = resolveListingTitle(listing, language);
  const photos = listingPhotoUrls(listing);
  const postedLabel = formatRelativeTime(listing.posted_at);
  const metadataLine = buildDetailMetadataLine({
    listing,
    postedLabel,
    messages,
  });
  const { categoryLabel, conditionLabel } = parseUgcDescriptionMeta(
    listing.description,
    messages,
  );
  const bodyText = stripUgcDescriptionMeta(listing.description, messages);
  const showBuyerFooter = !isOwner && isAvailable;
  const showOwnerFooter = isOwner && Boolean(ownerFooter);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface">
      <div className="relative mx-auto w-full max-w-container-max pb-28">
        <DetailPhotoGallery photos={photos} alt={displayTitle} controls={heroControls} />

        <div className="px-gutter pt-space-lg">
          {banner}

          <header className="border-b border-outline-variant pb-space-md">
            <div className="flex items-start justify-between gap-space-md">
              <div className="min-w-0 flex-1">
                <h1 className="text-h2 font-semibold leading-tight tracking-tight text-on-surface">
                  {displayTitle}
                </h1>
                <p
                  className="mt-space-xs text-label-sm text-on-surface-variant"
                  suppressHydrationWarning
                >
                  {metadataLine}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#ECFDF3] px-space-sm py-0.5 text-label-sm font-semibold text-[#16A34A]">
                {messages.detail.costFreeLabel.replace('.', '')}
              </span>
            </div>

            {(categoryLabel || conditionLabel) && (
              <div className="mt-space-md flex flex-wrap gap-space-xs">
                {categoryLabel ? (
                  <span className="rounded-full border border-outline-variant bg-[#f1f1f0] px-space-sm py-0.5 text-label-sm text-on-surface-variant">
                    {categoryLabel}
                  </span>
                ) : null}
                {conditionLabel ? (
                  <span className="rounded-full border border-outline-variant bg-[#f1f1f0] px-space-sm py-0.5 text-label-sm text-on-surface-variant">
                    {conditionLabel}
                  </span>
                ) : null}
              </div>
            )}
          </header>

          {bodyText ? (
            <section className="border-b border-outline-variant py-space-lg">
              <p className="whitespace-pre-line text-body-md leading-relaxed text-on-surface">
                {bodyText}
              </p>
            </section>
          ) : null}

          {!isAvailable && (
            <p className="py-space-md text-label-md font-medium text-secondary">
              {messages.listing.claimed}
            </p>
          )}

          {isOwner && !isAvailable && (
            <div className="py-space-md">
              <Link
                href="/post/manage"
                className="text-label-sm text-on-surface-variant underline-offset-2 hover:underline"
              >
                {messages.post.manageLink}
              </Link>
            </div>
          )}

          {!isOwner && isAvailable && (
            <p className="py-space-md text-body-md text-on-surface-variant">
              {messages.detail.pickupHintUgc}
            </p>
          )}

          {similarListings.length > 0 && (
            <section className="border-t border-outline-variant pt-space-lg">
              <SimilarListings listings={similarListings} />
            </section>
          )}
        </div>
      </div>

      {showBuyerFooter && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface-container-lowest/95 px-gutter py-space-md pb-[calc(env(safe-area-inset-bottom,0px)+16px)] backdrop-blur-sm">
          <div className="mx-auto max-w-container-max">
            <Button
              type="button"
              className={cn(
                'flex w-full items-center justify-center rounded-lg py-space-md text-label-md font-semibold',
              )}
              disabled={contactDisabled}
              onClick={onContact}
            >
              {messages.detail.messageOwner}
            </Button>
          </div>
        </div>
      )}

      {showOwnerFooter && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-outline-variant bg-surface-container-lowest/95 px-gutter py-space-md pb-[calc(env(safe-area-inset-bottom,0px)+16px)] backdrop-blur-sm">
          <div className="mx-auto max-w-container-max">{ownerFooter}</div>
        </div>
      )}
    </div>
  );
}
