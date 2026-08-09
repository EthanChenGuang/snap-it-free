'use client';

import { useEffect, useMemo, useState } from 'react';
import { ListListingCard } from '@/components/listings/ListListingCard';
import { excludeReportedIds } from '@/lib/listings/filters';
import { useListingsPoll } from '@/lib/listings/useListingsPoll';
import { readReportedIds, REPORTS_CHANGE_EVENT } from '@/lib/reports/storage';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type FeedHomeClientProps = {
  initialListings: ListingRow[];
};

export function FeedHomeClient({ initialListings }: FeedHomeClientProps) {
  const { messages } = useMessages();

  const { listings, isRefreshing } = useListingsPoll(initialListings);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportedIds, setReportedIds] = useState<string[]>([]);

  useEffect(() => {
    setReportedIds(readReportedIds());
    const handleReportsChange = () => setReportedIds(readReportedIds());
    window.addEventListener(REPORTS_CHANGE_EVENT, handleReportsChange);
    return () => window.removeEventListener(REPORTS_CHANGE_EVENT, handleReportsChange);
  }, []);

  const filteredListings = useMemo(() => {
    const visible = excludeReportedIds(listings, reportedIds);
    const query = searchQuery.trim().toLowerCase();

    return visible.filter((listing) => {
      if (!query) return true;
      return listing.title.toLowerCase().includes(query);
    });
  }, [listings, reportedIds, searchQuery]);

  return (
    <main className="flex h-full flex-col overflow-hidden bg-background">
      <div className="no-scrollbar flex-1 overflow-y-auto px-gutter pb-space-lg pt-space-lg">
        {filteredListings.length === 0 && isRefreshing ? (
          <div className="flex items-center justify-center p-space-xl text-label-sm text-on-surface-variant">
            {messages.list.refreshing}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="border border-outline-variant bg-surface-container-lowest p-space-xl text-center">
            <span className="material-symbols-outlined mb-space-sm text-4xl text-on-surface-variant">
              inventory_2
            </span>
            <p className="text-body-md font-semibold text-on-surface">
              {messages.list.emptyTitle}
            </p>
            <p className="mt-space-xs text-label-sm text-on-surface-variant">
              {messages.list.emptyDescription}
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-2 gap-space-md">
            {filteredListings.map((listing) => (
              <ListListingCard key={listing.id} listing={listing} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
