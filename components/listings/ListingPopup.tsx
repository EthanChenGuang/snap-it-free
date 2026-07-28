'use client';

import Link from 'next/link';
import { messages } from '@/messages/it';
import type { ListingRow } from '@/lib/listings/types';

type ListingPopupProps = {
  listing: ListingRow;
};

export function ListingPopup({ listing }: ListingPopupProps) {
  return (
    <div className="max-w-[200px] rounded border border-outline-variant bg-surface p-space-sm shadow-none">
      <p className="line-clamp-2 text-label-md font-semibold text-on-surface">{listing.title}</p>
      <Link
        href={`/listing/${listing.id}`}
        className="mt-space-sm inline-flex text-label-sm font-medium text-accent-orange hover:underline"
      >
        {messages.listing.viewOnSubito}
      </Link>
    </div>
  );
}
