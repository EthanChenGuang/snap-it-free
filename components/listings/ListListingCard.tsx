'use client';

import { useRouter } from 'next/navigation';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { buildCardMetadata } from '@/lib/listings/card-metadata';
import { listingConsumerCityLabel } from '@/lib/listings/feed-search';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type ListListingCardProps = {
  listing: ListingRow;
  /** Distance in meters from active center; null when coords or center unavailable. */
  distanceMeters?: number | null;
};

/**
 * Minimalist feed card — image, FREE badge, favorite, compact metadata.
 * iOS photo-first layout with top gradient legibility overlay and press feedback.
 */
export function ListListingCard({ listing, distanceMeters }: ListListingCardProps) {
  const { language, messages, formatRelativeTime } = useMessages();
  const displayTitle = resolveListingTitle(listing, language);
  const router = useRouter();
  const isClaimed = listing.status === 'claimed';
  const cityLabel = listingConsumerCityLabel(listing, {
    venice: messages.feed.cityVenice,
    padova: messages.feed.cityPadova,
  });
  const postedLabel = formatRelativeTime(listing.posted_at);
  const metadata = buildCardMetadata({
    distanceMeters,
    cityLabel,
    postedLabel,
    isClaimed,
    reservedLabel: messages.listing.reserved,
  });

  return (
    <article
      className="group flex cursor-pointer flex-col transition-transform duration-150 ease-out active:scale-[0.98]"
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
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-container-high">
        <ListingPhoto
          src={listing.photo_url}
          alt={displayTitle}
          className={cn(
            'object-cover transition-transform duration-500 group-hover:scale-105',
            isClaimed && 'opacity-60',
          )}
          sizes="(max-width: 768px) 50vw, 400px"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 rounded-t-2xl bg-gradient-to-b from-black/30 to-transparent"
          aria-hidden
        />
        <span className="absolute left-3 top-3 z-20 rounded-full bg-emerald-500/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {messages.listing.free}
        </span>
        <FavoriteButton
          listingId={listing.id}
          size="sm"
          tone="overlay"
          className="absolute right-3 top-3 z-20 h-9 w-9 rounded-full bg-black/30 p-2 backdrop-blur-md transition hover:bg-black/40"
        />
      </div>

      <div className="min-w-0">
        <h3 className="mt-2.5 line-clamp-1 text-sm font-medium text-neutral-900">{displayTitle}</h3>
        {metadata && (
          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-400" suppressHydrationWarning>
            {metadata}
          </p>
        )}
      </div>
    </article>
  );
}
