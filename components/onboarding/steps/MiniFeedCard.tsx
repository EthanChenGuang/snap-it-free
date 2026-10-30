'use client';

import { FreeBadge } from '@/components/listings/FreeBadge';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { useMessages } from '@/lib/i18n/useMessages';
import type { ListingRow } from '@/lib/listings/types';

/**
 * Static (non-interactive) preview of a real feed card for the "how it works" step: a real photo,
 * the FREE badge, the real title and the real posted-time. No distance faking — if we have no real
 * listing to show, nothing renders (the parent falls back to a plain text row).
 */
export function MiniFeedCard({ listing }: { listing: ListingRow | null }) {
  const { language, messages, formatRelativeTime } = useMessages();
  if (!listing) return null;
  const title = resolveListingTitle(listing, language);

  return (
    <div className="w-36 shrink-0 select-none" aria-hidden>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-container-high">
        <ListingPhoto src={listing.photo_url} alt="" variant="thumbnail" sizes="144px" />
        <div className="absolute left-2 top-2">
          <FreeBadge className="min-h-[22px] px-2 py-0.5 text-label-sm">{messages.listing.free}</FreeBadge>
        </div>
      </div>
      <p className="mt-1.5 line-clamp-1 text-label-sm font-semibold text-on-surface">{title}</p>
      <p className="text-label-sm text-on-surface-variant">{formatRelativeTime(listing.posted_at)}</p>
    </div>
  );
}
