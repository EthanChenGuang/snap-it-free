'use client';

import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { pop } from '@/components/onboarding/pop-theme';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { useMessages } from '@/lib/i18n/useMessages';
import type { ListingRow } from '@/lib/listings/types';
import { cn } from '@/lib/utils';

/**
 * Static (non-interactive) preview of a real feed card for the "how it works" step: a real photo,
 * the FREE badge, the real title and the real posted-time. No distance faking — if we have no real
 * listing to show, nothing renders (the parent falls back to a plain text row).
 */
export function MiniFeedCard({ listing, tilt = 0 }: { listing: ListingRow | null; tilt?: number }) {
  const { language, messages, formatRelativeTime } = useMessages();
  if (!listing) return null;
  const title = resolveListingTitle(listing, language);

  return (
    <div className={cn('w-[46%] shrink-0 select-none bg-white p-1.5', pop.card, 'rounded-2xl')} style={{ rotate: `${tilt}deg` }} aria-hidden>
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#F3E2CF]">
        <ListingPhoto src={listing.photo_url} alt="" variant="thumbnail" sizes="160px" />
        <span className="absolute left-1.5 top-1.5 rounded-full border-2 border-[#1A1A2E] bg-[#7FE0B0] px-2 py-0.5 text-[11px] font-black uppercase text-[#1A1A2E]">
          {messages.listing.free}
        </span>
      </div>
      <p className="mt-1.5 line-clamp-1 px-0.5 text-label-sm font-semibold text-[#1A1A2E]">{title}</p>
      <p className="px-0.5 pb-0.5 text-[11px] text-[#4A4A5E]">{formatRelativeTime(listing.posted_at)}</p>
    </div>
  );
}
