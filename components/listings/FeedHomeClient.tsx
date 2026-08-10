'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ListListingCard } from '@/components/listings/ListListingCard';
import { useFeedFilter } from '@/components/shell/FeedFilterContext';
import { useFeedScroll } from '@/components/shell/FeedScrollContext';
import { matchesFeedSearch } from '@/lib/listings/feed-search';
import { excludeReportedIds, matchesConsumerCity } from '@/lib/listings/filters';
import { matchesAnySubitoCategories } from '@/lib/listings/subito-categories';
import { useListingsPoll } from '@/lib/listings/useListingsPoll';
import { readReportedIds, REPORTS_CHANGE_EVENT } from '@/lib/reports/storage';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type FeedHomeClientProps = {
  initialListings: ListingRow[];
};

export function FeedHomeClient({ initialListings }: FeedHomeClientProps) {
  const { messages, language, zoneLabel } = useMessages();
  const { searchQuery, registerScrollContainer } = useFeedScroll();
  const { applied } = useFeedFilter();
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
      if (!matchesAnySubitoCategories(listing, applied.categories)) return false;
      if (!matchesConsumerCity(listing, applied.city)) return false;
      return matchesFeedSearch(listing, searchQuery, language, zoneLabel);
    });
  }, [listings, reportedIds, searchQuery, applied, language, zoneLabel]);

  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasCategoryFilter = applied.categories.length > 0;
  const hasCityFilter = applied.city !== 'all';
  const hasActiveFilter = hasSearchQuery || hasCategoryFilter || hasCityFilter;

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div
        ref={scrollRef}
        className="no-scrollbar h-full flex-1 overflow-y-auto px-gutter pt-space-sm pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"
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
              {hasActiveFilter ? messages.feed.emptySearchTitle : messages.feed.emptyTitle}
            </p>
            <p className="mt-space-xs text-label-sm text-on-surface-variant">
              {hasActiveFilter
                ? messages.feed.emptySearchDescription
                : messages.feed.emptyDescription}
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-2 gap-3">
            {filteredListings.map((listing) => (
              <ListListingCard key={listing.id} listing={listing} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
