'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ListListingCard } from '@/components/listings/ListListingCard';
import { useFeedScroll } from '@/components/shell/FeedScrollContext';
import { matchesFeedSearch } from '@/lib/listings/feed-search';
import { excludeReportedIds } from '@/lib/listings/filters';
import { matchesSubitoCategory } from '@/lib/listings/subito-categories';
import { useListingsPoll } from '@/lib/listings/useListingsPoll';
import { readReportedIds, REPORTS_CHANGE_EVENT } from '@/lib/reports/storage';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type FeedHomeClientProps = {
  initialListings: ListingRow[];
};

export function FeedHomeClient({ initialListings }: FeedHomeClientProps) {
  const { messages, language, zoneLabel } = useMessages();
  const { searchQuery, selectedCategory, registerScrollContainer } = useFeedScroll();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { listings, isRefreshing } = useListingsPoll(initialListings);
  const [reportedIds, setReportedIds] = useState<string[]>([]);

  useEffect(() => {
    setReportedIds(readReportedIds());
    const handleReportsChange = () => setReportedIds(readReportedIds());
    window.addEventListener(REPORTS_CHANGE_EVENT, handleReportsChange);
    return () => window.removeEventListener(REPORTS_CHANGE_EVENT, handleReportsChange);
  }, []);

  useEffect(() => {
    registerScrollContainer(scrollRef.current);
    return () => registerScrollContainer(null);
  }, [registerScrollContainer]);

  const filteredListings = useMemo(() => {
    const visible = excludeReportedIds(listings, reportedIds);
    return visible.filter((listing) => {
      if (!matchesSubitoCategory(listing, selectedCategory)) return false;
      return matchesFeedSearch(listing, searchQuery, language, zoneLabel);
    });
  }, [listings, reportedIds, searchQuery, selectedCategory, language, zoneLabel]);

  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasCategoryFilter = selectedCategory !== 'all';

  return (
    <main className="flex h-full flex-col overflow-hidden bg-background">
      <div
        ref={scrollRef}
        className="no-scrollbar flex-1 overflow-y-auto px-gutter pb-24 pt-space-sm"
      >
        {filteredListings.length === 0 && isRefreshing ? (
          <div className="flex items-center justify-center p-space-xl text-label-sm text-on-surface-variant">
            {messages.list.refreshing}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="p-space-xl text-center">
            <span className="material-symbols-outlined mb-space-sm text-4xl text-on-surface-variant">
              inventory_2
            </span>
            <p className="text-body-md font-semibold text-on-surface">
              {hasSearchQuery || hasCategoryFilter
                ? messages.feed.emptySearchTitle
                : messages.feed.emptyTitle}
            </p>
            <p className="mt-space-xs text-label-sm text-on-surface-variant">
              {hasSearchQuery || hasCategoryFilter
                ? messages.feed.emptySearchDescription
                : messages.feed.emptyDescription}
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-2 gap-x-space-md gap-y-space-lg">
            {filteredListings.map((listing) => (
              <ListListingCard key={listing.id} listing={listing} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
