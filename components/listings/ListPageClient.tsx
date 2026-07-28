'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ListingFeed } from '@/components/listings/ListingFeed';
import { ZoneFilterChips } from '@/components/map/ZoneFilterChips';
import { filterByZone } from '@/lib/listings/filters';
import { useListingsPoll } from '@/lib/listings/useListingsPoll';
import type { ListingRow, ZoneChip } from '@/lib/listings/types';
import { messages } from '@/messages/it';

type ListPageClientProps = {
  initialListings: ListingRow[];
};

export function ListPageClient({ initialListings }: ListPageClientProps) {
  const { listings, refresh, isRefreshing } = useListingsPoll(initialListings);
  const [selectedZone, setSelectedZone] = useState<ZoneChip>('All');

  const filteredListings = useMemo(
    () => filterByZone(listings, selectedZone),
    [listings, selectedZone],
  );

  return (
    <main className="flex h-full flex-col overflow-hidden pb-24">
      <div className="shrink-0 border-b border-outline-variant px-gutter py-space-md">
        <div className="flex items-start justify-between gap-space-md">
          <div>
            <h1 className="text-h3 font-bold text-on-surface">{messages.list.pageTitle}</h1>
            <p className="text-label-sm text-on-surface-variant">
              {messages.sheet.itemsInArea(filteredListings.length)}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void refresh()}
            disabled={isRefreshing}
          >
            {isRefreshing ? messages.list.refreshing : messages.list.refresh}
          </Button>
        </div>
        <div className="mt-space-md">
          <ZoneFilterChips selectedZone={selectedZone} onZoneChange={setSelectedZone} />
        </div>
      </div>
      <ListingFeed listings={filteredListings} selectedId={null} />
    </main>
  );
}
