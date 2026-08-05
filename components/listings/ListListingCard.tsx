'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { resolveListingCategory, resolveListingTitle } from '@/lib/i18n/listing-fields';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type ListListingCardProps = {
  listing: ListingRow;
};

function listingLocationLabel(
  listing: ListingRow,
  zoneLabel: ReturnType<typeof useMessages>['zoneLabel'],
): string {
  if (listing.zone) {
    return zoneLabel(listing.zone);
  }
  if (listing.city) {
    return listing.city.charAt(0).toUpperCase() + listing.city.slice(1);
  }
  return '';
}

/** Stitch listing_feed Notion card — image, metadata, full-width Claim Item CTA. */
export function ListListingCard({ listing }: ListListingCardProps) {
  const { language, messages, zoneLabel, formatRelativeTime } = useMessages();
  const displayTitle = resolveListingTitle(listing, language);
  const categoryLabel = resolveListingCategory(listing, language);

  const router = useRouter();
  const isClaimed = listing.status === 'claimed';
  const locationText = listingLocationLabel(listing, zoneLabel);
  const postedLabel = formatRelativeTime(listing.posted_at);
  const isVeniceZoned = listing.zone != null;

  const handleClaimClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    router.push(`/listing/${listing.id}`);
  };

  return (
    <article
      className="group flex cursor-pointer flex-col border border-outline-variant bg-surface-container-lowest p-space-md transition-colors hover:border-primary"
      onClick={() => router.push(`/listing/${listing.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          router.push(`/listing/${listing.id}`);
        }
      }}
      role="link"
      tabIndex={0}
    >
      <div className="relative mb-space-md aspect-video overflow-hidden rounded-sm bg-surface-container-high">
        {listing.photo_url ? (
          <Image
            src={listing.photo_url}
            alt={displayTitle}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 400px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined">image</span>
          </div>
        )}
        {categoryLabel && (
          <span
            className={cn(
              'absolute left-space-sm top-space-sm rounded-sm px-space-sm py-space-xs text-[10px] font-bold uppercase tracking-wider',
              isVeniceZoned
                ? 'border border-outline-variant bg-[#f1f1f0] text-on-surface'
                : 'border border-transparent bg-surface-container-high text-on-surface',
            )}
          >
            {categoryLabel}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="mb-space-sm flex items-start justify-between gap-space-sm">
          <h3 className="text-body-lg font-semibold leading-tight text-on-surface group-hover:underline">
            {displayTitle}
          </h3>
          <span className="shrink-0 text-body-md font-bold text-on-surface">
            {messages.listing.free}
          </span>
        </div>

        <div className="mb-space-md flex flex-wrap items-center gap-x-space-sm gap-y-space-xs text-label-sm text-on-surface-variant">
          <span>{postedLabel}</span>
        </div>

        {locationText && (
          <div className="mb-space-md flex items-center gap-1 text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            <span className="truncate">{locationText}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleClaimClick}
        disabled={isClaimed}
        className={cn(
          'w-full py-space-sm text-label-md font-medium transition-all active:scale-95',
          isClaimed
            ? 'border border-primary bg-surface text-primary hover:bg-surface-container'
            : 'bg-primary text-on-primary hover:opacity-90',
        )}
      >
        {isClaimed ? messages.listing.claimed : messages.listing.claimItem}
      </button>
    </article>
  );
}
