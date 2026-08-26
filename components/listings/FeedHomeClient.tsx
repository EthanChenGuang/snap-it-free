'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ListListingCard } from '@/components/listings/ListListingCard';
import { RubberbandScroll } from '@/components/ui/RubberbandScroll';
import { useFeedFilter } from '@/components/shell/FeedFilterContext';
import { useFeedScroll } from '@/components/shell/FeedScrollContext';
import { composeFeedListings, useDistanceCenter } from '@/hooks/useDistanceCenter';
import { consumerCityLabelsFromMessages } from '@/lib/i18n/city-labels';
import { excludeReportedIds } from '@/lib/listings/filters';
import { useListingsPoll } from '@/lib/listings/useListingsPoll';
import { readReportedIds, REPORTS_CHANGE_EVENT } from '@/lib/reports/storage';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type FeedHomeClientProps = {
  initialListings: ListingRow[];
};

export function FeedHomeClient({ initialListings }: FeedHomeClientProps) {
  const { messages, language } = useMessages();
  const { searchQuery, registerScrollContainer } = useFeedScroll();
  const { applied } = useFeedFilter();
  const mapModeActive = applied.mode === 'map' && applied.radiusEnabled;
  const { center } = useDistanceCenter(mapModeActive);
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

  const cityLabels = useMemo(
    () => consumerCityLabelsFromMessages(messages),
    [messages],
  );

  const filteredListings = useMemo(() => {
    const visible = excludeReportedIds(listings, reportedIds);
    const { listings: filtered } = composeFeedListings({
      listings: visible,
      applied,
      center,
      searchQuery,
      language,
      cityLabels,
    });
    return filtered;
  }, [listings, reportedIds, searchQuery, applied, center, language, cityLabels]);

  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasCategoryFilter = applied.categories.length > 0;
  const hasCityFilter = applied.mode === 'city' && applied.city !== 'all';
  const hasRadiusFilter = mapModeActive;
  const hasActiveFilter =
    hasSearchQuery || hasRadiusFilter || hasCityFilter || hasCategoryFilter;

  return (
    <main className="feed-home flex h-full min-h-0 flex-col overflow-hidden">
      <RubberbandScroll
        ref={scrollRef}
        className="feed-home-scroll no-scrollbar h-full flex-1 px-5 pt-1 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-6"
      >
        {filteredListings.length === 0 && isRefreshing ? (
          <div className="flex items-center justify-center p-space-xl text-label-sm text-on-surface-variant">
            {messages.list.refreshing}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="feed-empty-state p-space-xl text-center">
            <span className="material-symbols-outlined mb-space-md text-h1 font-light text-on-surface-variant/60">
              inventory_2
            </span>
            <p className="text-h3 font-semibold tracking-[-0.03em] text-on-surface">
              {hasActiveFilter ? messages.feed.emptySearchTitle : messages.feed.emptyTitle}
            </p>
            <p className="mx-auto mt-2 max-w-[28ch] text-body-md leading-relaxed text-on-surface-variant">
              {hasActiveFilter
                ? messages.feed.emptySearchDescription
                : messages.feed.emptyDescription}
            </p>
          </div>
        ) : (
          <>
            <header className="feed-home-hero mb-8 px-0.5">
              <h1 className="text-h1 font-bold leading-tight tracking-[-0.04em] text-on-surface">
                {messages.sheet.newArrivals}
              </h1>
              <p className="mt-2 text-body-md font-medium tracking-[-0.01em] text-on-surface-variant/80">
                {messages.sheet.itemsInArea(filteredListings.length)}
              </p>
            </header>

            <section className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 sm:gap-y-12">
              {filteredListings.map((listing, index) => (
                <ListListingCard
                  key={listing.id}
                  listing={listing}
                  priority={index < 6}
                  index={index}
                />
              ))}
            </section>
          </>
        )}
      </RubberbandScroll>
    </main>
  );
}
