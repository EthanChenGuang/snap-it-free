'use client';

import { useRouter } from 'next/navigation';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type ListListingCardProps = {
  listing: ListingRow;
  /** Distance in meters from active center; wired to metadata in Plan 10-04. */
  distanceMeters?: number;
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

/** Minimalist feed card — image, FREE badge, favorite, compact metadata. */
export function ListListingCard({ listing, distanceMeters: _distanceMeters }: ListListingCardProps) {
  const { language, messages, zoneLabel, formatRelativeTime } = useMessages();
  const displayTitle = resolveListingTitle(listing, language);
  const router = useRouter();
  const locationText = listingLocationLabel(listing, zoneLabel);
  const postedLabel = formatRelativeTime(listing.posted_at);
  const metadata = [locationText, postedLabel].filter(Boolean).join(' · ');

  return (
    <article
      className="group flex cursor-pointer flex-col"
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
      <div className="relative mb-space-sm aspect-[4/5] overflow-hidden rounded-2xl bg-surface-container-high">
        <ListingPhoto
          src={listing.photo_url}
          alt={displayTitle}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 400px"
        />
        <span className="absolute left-space-sm top-space-sm rounded-full bg-emerald-500/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {messages.listing.free}
        </span>
        <FavoriteButton
          listingId={listing.id}
          size="sm"
          tone="overlay"
          className="absolute right-space-sm top-space-sm h-9 w-9 rounded-full bg-black/30 p-2 backdrop-blur-md transition hover:scale-105 hover:bg-black/40"
        />
      </div>

      <div className="min-w-0 px-space-xs">
        <h3 className="line-clamp-1 text-label-md font-medium leading-tight text-on-surface">
          {displayTitle}
        </h3>
        {metadata && (
          <p
            className="mt-space-xs line-clamp-1 text-xs text-on-surface-variant"
            suppressHydrationWarning
          >
            {metadata}
          </p>
        )}
      </div>
    </article>
  );
}
