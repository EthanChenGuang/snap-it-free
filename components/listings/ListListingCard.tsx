'use client';

import Link from 'next/link';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { FreeBadge } from '@/components/listings/FreeBadge';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { buildCardMetadata } from '@/lib/listings/card-metadata';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

type ListListingCardProps = {
  listing: ListingRow;
  /** Eager-load photo for above-the-fold cards. */
  priority?: boolean;
  /** Stagger entrance animation on the home feed. */
  index?: number;
};

/**
 * Premium feed card — editorial photo frame, glass overlays, refined type.
 */
export function ListListingCard({
  listing,
  priority = false,
  index = 0,
}: ListListingCardProps) {
  const { language, messages, formatRelativeTime } = useMessages();
  const displayTitle = resolveListingTitle(listing, language);
  const isClaimed = listing.status === 'claimed';
  const postedLabel = formatRelativeTime(listing.posted_at);
  const metadata = buildCardMetadata({
    postedLabel,
    isClaimed,
    reservedLabel: messages.listing.reserved,
  });

  return (
    <article
      className="feed-card group flex flex-col outline-none"
      style={{ animationDelay: `${Math.min(index, 14) * 45}ms` }}
    >
      <div className="relative">
        <Link href={`/listing/${listing.id}`} prefetch className="block">
          <div
            className={cn(
              'feed-card-media relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-container-high',
              isClaimed && 'opacity-90',
            )}
          >
            <ListingPhoto
              src={listing.photo_url}
              alt={displayTitle}
              priority={priority}
              variant="feed"
              className={cn(
                'feed-card-image object-cover',
                isClaimed && 'saturate-[0.65]',
              )}
              sizes="(max-width: 768px) 50vw, 280px"
            />

            <div className="feed-card-media-shine pointer-events-none absolute inset-0 z-[4]" aria-hidden />

            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-[6] h-16 bg-gradient-to-b from-black/10 via-black/3 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-24 bg-gradient-to-t from-black/30 via-black/10 to-transparent"
              aria-hidden
            />

            <div className="absolute left-2.5 top-2.5 z-10">
              <FreeBadge>{messages.listing.free}</FreeBadge>
            </div>
          </div>
        </Link>

        <FavoriteButton
          listingId={listing.id}
          size="sm"
          tone="overlay"
          className="absolute right-1 top-1 z-10"
        />
      </div>

      <Link href={`/listing/${listing.id}`} prefetch className="feed-card-caption min-w-0 px-0.5 pt-3.5">
        <h3 className="line-clamp-2 text-body-md font-semibold leading-snug tracking-[-0.02em] text-on-surface">
          {displayTitle}
        </h3>
        {metadata && (
          <p
            className="mt-1.5 line-clamp-1 text-label-sm font-medium tracking-[-0.01em] text-on-surface-variant/75 tabular-nums"
            suppressHydrationWarning
          >
            {metadata}
          </p>
        )}
      </Link>
    </article>
  );
}
