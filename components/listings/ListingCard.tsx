'use client';

import Image from 'next/image';
import Link from 'next/link';
import { forwardRef } from 'react';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { ReservedBadge } from '@/components/listings/ReservedBadge';
import { resolveListingCategory, resolveListingTitle } from '@/lib/i18n/listing-fields';
import { useMessages } from '@/lib/i18n/useMessages';
import type { ListingRow } from '@/lib/listings/types';
import { cn } from '@/lib/utils';

type ListingCardProps = {
  listing: ListingRow;
  isSelected?: boolean;
};

function sourceBadgeLabel(
  source: ListingRow['source'],
  messages: ReturnType<typeof useMessages>['messages'],
): string {
  if (source === 'ugc') return messages.listing.sourceCommunity;
  return messages.listing.sourceSubito;
}

function listingLocationLabel(
  listing: ListingRow,
  zoneLabel: ReturnType<typeof useMessages>['zoneLabel'],
): string {
  if (listing.zone) {
    return zoneLabel(listing.zone).toUpperCase();
  }
  if (listing.city) {
    return listing.city.toUpperCase();
  }
  return '';
}

export const ListingCard = forwardRef<HTMLAnchorElement, ListingCardProps>(
  function ListingCard({ listing, isSelected }, ref) {
    const { language, messages, zoneLabel, formatRelativeTime } = useMessages();
    const displayTitle = resolveListingTitle(listing, language);
    const categoryLabel = resolveListingCategory(listing, language);
    const locationText = listingLocationLabel(listing, zoneLabel);
    const postedLabel = formatRelativeTime(listing.posted_at);
    const isVeniceZoned = listing.zone != null;

    return (
      <Link
        ref={ref}
        href={`/listing/${listing.id}`}
        className="group block w-full cursor-pointer text-left"
      >
        <div
          className={cn(
            'relative mb-space-sm aspect-square overflow-hidden rounded-lg border border-outline-variant bg-surface-container-high',
            isSelected && 'ring-1 ring-primary',
          )}
        >
          {listing.photo_url ? (
            <Image
              src={listing.photo_url}
              alt={displayTitle}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 320px"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined">image</span>
            </div>
          )}
          <div className="absolute left-space-sm top-space-sm flex flex-wrap gap-space-xs">
            <span className="rounded-sm border border-outline-variant bg-surface px-space-sm py-space-xs text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              {sourceBadgeLabel(listing.source, messages)}
            </span>
            {listing.status === 'claimed' && <ReservedBadge />}
          </div>
          <div className="absolute right-space-sm top-space-sm">
            <FavoriteButton listingId={listing.id} className="bg-surface/90" />
          </div>
        </div>

        <div className="flex items-start justify-between gap-space-sm">
          <div className="min-w-0">
            <div className="mb-1 flex flex-col gap-1">
              {locationText && (
                <p className="text-label-sm uppercase tracking-widest text-secondary">
                  {locationText}
                </p>
              )}
              {categoryLabel && (
                <span
                  className={cn(
                    'w-max rounded-full px-2 py-1 text-label-sm',
                    isVeniceZoned
                      ? 'bg-[#f1f1f0] text-on-surface'
                      : 'border border-transparent bg-surface-container-high text-on-surface',
                  )}
                >
                  {categoryLabel}
                </span>
              )}
            </div>
            <h3 className="text-body-lg font-semibold leading-snug text-on-surface group-hover:underline">
              {displayTitle}
            </h3>
            <p className="mt-space-xs text-label-sm text-on-surface-variant">{postedLabel}</p>
          </div>
          <span className="shrink-0 rounded border border-outline-variant bg-surface-container px-space-sm py-space-xs text-label-sm font-bold text-on-surface">
            {messages.listing.free}
          </span>
        </div>
      </Link>
    );
  },
);
