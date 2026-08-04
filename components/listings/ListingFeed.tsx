'use client';

import { useEffect, useRef } from 'react';
import { messages } from '@/messages/it';
import type { ListingRow } from '@/lib/listings/types';
import { ListingCard } from './ListingCard';

type ListingFeedProps = {
  listings: ListingRow[];
  selectedId: string | null;
};

export function ListingFeed({ listings, selectedId }: ListingFeedProps) {
  const cardRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current.get(selectedId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-gutter pb-space-lg pt-space-sm">
        <h2 className="text-h2 font-semibold text-on-surface">
          {messages.sheet.newArrivals}
        </h2>
        <p className="mt-space-xs text-label-sm text-on-surface-variant">
          {messages.sheet.itemsInArea(listings.length)}
        </p>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-gutter pb-space-lg">
        <div className="grid grid-cols-1 gap-space-md">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              ref={(node) => {
                if (node) cardRefs.current.set(listing.id, node);
                else cardRefs.current.delete(listing.id);
              }}
              listing={listing}
              isSelected={selectedId === listing.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
