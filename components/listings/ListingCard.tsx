'use client';

import Image from 'next/image';
import Link from 'next/link';
import { forwardRef } from 'react';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { ReservedBadge } from '@/components/listings/ReservedBadge';
import { messages, formatRelativeTimeItalian, zoneLabel } from '@/messages/it';
import type { ListingRow } from '@/lib/listings/types';
import { cn } from '@/lib/utils';

type ListingCardProps = {
  listing: ListingRow;
  isSelected?: boolean;
};

function sourceBadgeLabel(source: ListingRow['source']): string {
  if (source === 'ugc') return messages.listing.sourceCommunity;
  return messages.listing.sourceSubito;
}

export const ListingCard = forwardRef<HTMLAnchorElement, ListingCardProps>(
  function ListingCard({ listing, isSelected }, ref) {
    const zoneText = listing.zone ? zoneLabel(listing.zone) : messages.listing.approximateZone;
    const postedLabel = formatRelativeTimeItalian(listing.posted_at);
    const isUgc = listing.source === 'ugc';

    return (
      <Link
        ref={ref}
        href={`/listing/${listing.id}`}
        className={cn(
          'group block w-full cursor-pointer rounded border border-outline-variant bg-surface p-space-sm text-left transition-colors',
          isSelected
            ? 'border-primary ring-1 ring-primary'
            : 'hover:border-on-surface',
        )}
      >
        <div className="relative mb-space-sm aspect-square overflow-hidden rounded-sm border border-outline-variant bg-surface-container-high">
          {listing.photo_url ? (
            <Image
              src={listing.photo_url}
              alt={listing.title}
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
            <span
              className={`rounded-sm px-space-sm py-space-xs text-[10px] font-bold uppercase tracking-wider ${
                isUgc
                  ? 'bg-surface-container-high text-on-surface-variant'
                  : 'bg-accent-orange text-on-primary'
              }`}
            >
              {sourceBadgeLabel(listing.source)}
            </span>
            {listing.status === 'claimed' && <ReservedBadge />}
          </div>
          <div className="absolute right-space-sm top-space-sm">
            <FavoriteButton listingId={listing.id} className="bg-surface/90" />
          </div>
        </div>

        <div className="flex items-start justify-between gap-space-sm">
          <div className="min-w-0">
            <p className="text-label-sm font-semibold uppercase tracking-wider text-secondary">
              {zoneText}
            </p>
            <h3 className="text-body-md font-semibold leading-snug text-on-surface group-hover:underline">
              {listing.title}
            </h3>
            <p className="mt-space-xs text-label-sm text-on-surface-variant">{postedLabel}</p>
          </div>
          <span className="shrink-0 rounded border border-accent-orange/30 bg-accent-orange/10 px-space-sm py-space-xs text-label-sm font-bold text-accent-orange">
            {messages.listing.free}
          </span>
        </div>
      </Link>
    );
  },
);
