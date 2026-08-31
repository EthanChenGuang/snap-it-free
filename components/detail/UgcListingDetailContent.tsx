'use client';

import '@/app/listing-detail.css';
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

type UgcListingDetailContentProps = {
  listing: ListingRow & { description?: string | null };
  similarListings: ListingRow[];
  isAvailable: boolean;
  isOwner: boolean;
  onContact: () => void;
  contactDisabled?: boolean;
  ownerFooter?: React.ReactNode;
  ownerMessagesAction?: React.ReactNode;
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
  ownerMessagesAction,
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
    <div className="listing-detail flex h-full flex-col overflow-y-auto bg-surface">
      <div className="relative mx-auto w-full max-w-container-max pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
        <DetailPhotoGallery photos={photos} alt={displayTitle} controls={heroControls} />

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

            {(categoryLabel || conditionLabel) && (
              <div className="mt-space-md flex flex-wrap gap-space-xs">
                {categoryLabel ? (
                  <span className="listing-detail-chip">{categoryLabel}</span>
                ) : null}
                {conditionLabel ? (
                  <span className="listing-detail-chip">{conditionLabel}</span>
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

          <section className="border-b border-outline-variant py-space-md">
            <p className="text-h3 font-semibold text-primary">{messages.detail.costFreeLabel}</p>
            {!isOwner && isAvailable && (
              <p className="mt-space-xs text-body-md text-on-surface-variant">
                {messages.detail.pickupHintUgc}
              </p>
            )}
          </section>

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

          {isOwner && ownerMessagesAction ? (
            <div className="border-b border-outline-variant py-space-md">{ownerMessagesAction}</div>
          ) : null}

          {similarListings.length > 0 && (
            <section className="pt-space-lg">
              <SimilarListings listings={similarListings} />
            </section>
          )}
        </div>
      </div>

      {showBuyerFooter && (
        <div className="listing-detail-sticky-bar">
          <div className="mx-auto max-w-container-max">
            <Button
              type="button"
              className="flex min-h-11 w-full items-center justify-center py-space-md text-label-md font-semibold"
              disabled={contactDisabled}
              onClick={onContact}
            >
              {messages.detail.messageOwner}
            </Button>
          </div>
        </div>
      )}

      {showOwnerFooter && (
        <div className="listing-detail-sticky-bar">
          <div className="mx-auto max-w-container-max">{ownerFooter}</div>
        </div>
      )}
    </div>
  );
}
