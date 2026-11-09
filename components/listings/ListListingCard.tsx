'use client';

import Link from 'next/link';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { FreeBadge } from '@/components/listings/FreeBadge';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { buildCardMetadata } from '@/lib/listings/card-metadata';
import { consumerCityLabelsFromMessages } from '@/lib/i18n/city-labels';
import { listingConsumerCityLabel } from '@/lib/listings/feed-search';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

/** Categories whose items usually look good as a big photo (furniture, pets, tech, appliances, bikes). */
const HERO_CATEGORIES = new Set([
  'arredamento-casalinghi',
  'animali',
  'informatica',
  'telefonia',
  'elettrodomestici',
  'biciclette',
]);

/**
 * Whether a listing may get the full-width card: a photo-friendly category and more than one photo (a
 * sign the seller took care). A big photo of a bracket or a box of jars makes the feed look cheaper.
 */
export function isHeroWorthy(listing: Pick<ListingRow, 'photo_url' | 'photo_urls' | 'category'>): boolean {
  if (!listing.photo_url || !listing.category || !HERO_CATEGORIES.has(listing.category)) return false;
  return (listing.photo_urls?.length ?? 0) > 1;
}

type ListListingCardProps = {
  listing: ListingRow;
  /** Eager-load photo for above-the-fold cards. */
  priority?: boolean;
  /** Stagger entrance animation on the home feed. */
  index?: number;
  onUnfavorite?: (listingId: string) => void;
  /** Full-width "hero" card with a larger, full-frame photo (every few items on the home feed). */
  hero?: boolean;
};

/**
 * Premium feed card — the photo sits inset in a white card like a framed print (Stitch "warm gallery",
 * 2026-11-09), so casual seller photos read as deliberately displayed. `hero` makes a full-width card.
 */
export function ListListingCard({
  listing,
  priority = false,
  index = 0,
  onUnfavorite,
  hero = false,
}: ListListingCardProps) {
  const { language, messages, formatRelativeTime } = useMessages();
  const displayTitle = resolveListingTitle(listing, language);
  const isClaimed = listing.status === 'claimed';
  const postedLabel = formatRelativeTime(listing.posted_at);
  const cityLabel = listingConsumerCityLabel(listing, consumerCityLabelsFromMessages(messages));
  const metadata = buildCardMetadata({
    postedLabel: cityLabel ? `${cityLabel} · ${postedLabel}` : postedLabel,
    isClaimed,
    reservedLabel: messages.listing.reserved,
  });

  return (
    <article
      className={cn('feed-card feed-card-frame group flex h-full flex-col outline-none', hero && 'col-span-full')}
      style={{ animationDelay: `${Math.min(index, 14) * 45}ms` }}
    >
      <div className="relative">
        <Link href={`/listing/${listing.id}`} prefetch className="block">
          <div
            className={cn(
              'feed-card-media relative overflow-hidden rounded-[14px] bg-surface-container-high',
              hero ? 'aspect-[4/3]' : 'aspect-[4/5]',
              isClaimed && 'opacity-90',
            )}
          >
            <ListingPhoto
              src={listing.photo_url}
              alt={displayTitle}
              priority={priority}
              variant={hero ? 'default' : 'feed'}
              className={cn(
                'feed-card-image object-cover',
                isClaimed && 'saturate-[0.65]',
              )}
              sizes={hero ? '(max-width: 768px) 100vw, 720px' : '(max-width: 768px) 50vw, 280px'}
            />

            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-[6] h-14 bg-gradient-to-b from-black/12 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-20 bg-gradient-to-t from-black/28 via-black/8 to-transparent"
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
          onRemoved={onUnfavorite}
        />
      </div>

      <Link href={`/listing/${listing.id}`} prefetch className="feed-card-caption min-w-0 flex-1 px-1.5 pb-1.5 pt-3">
        <h3
          className={cn(
            'line-clamp-2 font-semibold leading-snug tracking-[-0.02em] text-on-surface',
            hero ? 'text-body-lg' : 'text-body-md',
          )}
        >
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
