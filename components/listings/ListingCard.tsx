'use client';

import Image from 'next/image';
import Link from 'next/link';
import { forwardRef } from 'react';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { FreeBadge } from '@/components/listings/FreeBadge';
import { ReservedBadge } from '@/components/listings/ReservedBadge';
import { resolveListingCategory, resolveListingTitle } from '@/lib/i18n/listing-fields';
import { consumerCityLabelsFromMessages } from '@/lib/i18n/city-labels';
import { useMessages } from '@/lib/i18n/useMessages';
import { listingConsumerLocationLabel } from '@/lib/listings/feed-search';
import type { ListingRow } from '@/lib/listings/types';
import { cn } from '@/lib/utils';

type ListingCardProps = {
  listing: ListingRow;
  isSelected?: boolean;
};

export const ListingCard = forwardRef<HTMLAnchorElement, ListingCardProps>(
  function ListingCard({ listing, isSelected }, ref) {
    const { language, messages, formatRelativeTime } = useMessages();
    const displayTitle = resolveListingTitle(listing, language);
    const categoryLabel = resolveListingCategory(listing, language);
    const locationText = listingConsumerLocationLabel(
      listing,
      consumerCityLabelsFromMessages(messages),
      messages.listing.approximateZone,
    ).toUpperCase();
    const postedLabel = formatRelativeTime(listing.posted_at);
    const isVeniceZoned = listing.zone != null;

    return (
      <div className="group block w-full text-left">
        <div
          className={cn(
            'relative mb-space-sm aspect-square overflow-hidden rounded-lg border border-outline-variant bg-surface-container-high',
            isSelected && 'ring-1 ring-primary',
          )}
        >
          <Link
            ref={ref}
            href={`/listing/${listing.id}`}
            className="block h-full w-full cursor-pointer"
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
          </Link>
          <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex flex-wrap gap-space-xs">
            <FreeBadge>{messages.listing.free}</FreeBadge>
            {listing.source === 'ugc' && (
              <span className="rounded-sm border border-outline-variant bg-surface px-space-sm py-space-xs text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                {messages.listing.sourceCommunity}
              </span>
            )}
            {listing.status === 'claimed' && <ReservedBadge />}
          </div>
          <FavoriteButton
            listingId={listing.id}
            size="sm"
            tone="overlay"
            className="absolute right-1 top-1 z-10"
          />
        </div>

        <Link href={`/listing/${listing.id}`} className="block min-w-0 cursor-pointer">
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
        </Link>
      </div>
    );
  },
);
