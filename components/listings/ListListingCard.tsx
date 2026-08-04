'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { inferListingCategory } from '@/lib/listings/categories';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type ListListingCardProps = {
  listing: ListingRow;
};

/** Stitch listing_feed Notion card — image, metadata, full-width Claim Item CTA. */
export function ListListingCard({ listing }: ListListingCardProps) {
  const { messages, zoneLabel, categoryLabel, formatRelativeTime } = useMessages();

  const router = useRouter();
  const isClaimed = listing.status === 'claimed';
  const zoneText = listing.zone ? zoneLabel(listing.zone) : messages.listing.approximateZone;
  const postedLabel = formatRelativeTime(listing.posted_at);
  const inferredCategory = inferListingCategory(listing.title);

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
            alt={listing.title}
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
      </div>

      <div className="flex flex-1 flex-col">
        <div className="mb-space-sm flex items-start justify-between gap-space-sm">
          <h3 className="text-body-lg font-semibold leading-tight text-on-surface group-hover:underline">
            {listing.title}
          </h3>
          <span className="shrink-0 text-body-md font-bold text-on-surface">
            {messages.listing.free}
          </span>
        </div>

        <div className="mb-space-md flex flex-wrap items-center gap-x-space-sm gap-y-space-xs text-label-sm text-on-surface-variant">
          {inferredCategory && (
            <span className="rounded-sm border border-outline-variant bg-surface px-space-sm py-space-xs text-[10px] font-bold uppercase tracking-wider">
              {categoryLabel(inferredCategory)}
            </span>
          )}
          <span>{postedLabel}</span>
        </div>

        <div className="mb-space-md flex items-center gap-1 text-label-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px]">location_on</span>
          <span className="truncate">{zoneText}</span>
        </div>
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
