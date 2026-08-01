'use client';

import Link from 'next/link';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { messages } from '@/messages/it';
import type { ListingRow } from '@/lib/listings/types';

type ListingPopupProps = {
  listing: ListingRow;
};

export function ListingPopup({ listing }: ListingPopupProps) {
  const isReserved = listing.status === 'claimed';

  return (
    <div className="max-w-[200px] rounded border border-outline-variant bg-surface p-space-sm shadow-none">
      <div className="flex items-start justify-between gap-space-xs">
        <p className="line-clamp-2 text-label-md font-semibold text-on-surface">{listing.title}</p>
        <FavoriteButton listingId={listing.id} size="sm" />
      </div>
      {isReserved && (
        <span className="mt-space-xs inline-flex rounded border border-outline-variant bg-surface-container-highest px-space-sm py-space-xs text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
          {messages.listing.reserved}
        </span>
      )}
      <Link
        href={`/listing/${listing.id}`}
        className="mt-space-sm inline-flex text-label-sm font-medium text-accent-orange hover:underline"
      >
        {messages.listing.viewDetail}
      </Link>
    </div>
  );
}
