'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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
import { cn } from '@/lib/utils';

type FeedHomeClientProps = {
  initialListings: ListingRow[];
  initialTotalCount?: number | null;
};

const CONTENT_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
};

export function FeedHomeClient({
  initialListings,
  initialTotalCount = null,
}: FeedHomeClientProps) {
  const { messages, language } = useMessages();
  const { searchQuery, registerScrollContainer } = useFeedScroll();
  const { applied } = useFeedFilter();
  const mapModeActive = applied.mode === 'map' && applied.radiusEnabled;
  const { center } = useDistanceCenter(mapModeActive);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { listings, totalCount, isRefreshing } = useListingsPoll(initialListings, {
    initialTotalCount,
  });
  const [reportedIds, setReportedIds] = useState<string[]>([]);
  const [countPulse, setCountPulse] = useState(false);
  const prevCountRef = useRef<number | null>(null);

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

  const filterKey = useMemo(() => {
    const centerKey =
      mapModeActive && center
        ? `${center.lat.toFixed(3)},${center.lng.toFixed(3)}`
        : 'none';
    return [
      searchQuery.trim(),
      applied.mode,
      applied.city,
      applied.categories.join(','),
      centerKey,
      applied.radiusEnabled ? applied.radiusKm : '',
    ].join('|');
  }, [searchQuery, applied, center, mapModeActive]);

  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasCategoryFilter = applied.categories.length > 0;
  const hasCityFilter = applied.mode === 'city' && applied.city !== 'all';
  const hasRadiusFilter = mapModeActive;
  const hasActiveFilter =
    hasSearchQuery || hasRadiusFilter || hasCityFilter || hasCategoryFilter;

  const displayCount = hasActiveFilter
    ? filteredListings.length
    : (totalCount ?? filteredListings.length);

  useEffect(() => {
    const count = displayCount;
    if (prevCountRef.current !== null && prevCountRef.current !== count) {
      setCountPulse(true);
      const timer = window.setTimeout(() => setCountPulse(false), 320);
      prevCountRef.current = count;
      return () => window.clearTimeout(timer);
    }
    prevCountRef.current = count;
  }, [displayCount]);

  const contentMotion = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : CONTENT_MOTION;

  const viewState =
    filteredListings.length === 0 && isRefreshing
      ? 'loading'
      : filteredListings.length === 0
        ? 'empty'
        : 'grid';

  return (
    <main className="feed-home flex h-full min-h-0 flex-col overflow-hidden">
      <RubberbandScroll
        ref={scrollRef}
        className="feed-home-scroll no-scrollbar h-full flex-1 px-5 pt-1 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          {viewState === 'loading' && (
            <motion.div
              key="loading"
              role="status"
              className="flex items-center justify-center p-space-xl text-label-sm text-on-surface-variant"
              {...contentMotion}
            >
              {messages.list.refreshing}
            </motion.div>
          )}

          {viewState === 'empty' && (
            <motion.div
              key={`empty-${filterKey}`}
              role="status"
              className="feed-empty-state p-space-xl text-center"
              {...contentMotion}
            >
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
            </motion.div>
          )}

          {viewState === 'grid' && (
            <motion.div key={`grid-${filterKey}`} {...contentMotion}>
              {isRefreshing && (
                <div className="feed-refresh-hint" aria-live="polite">
                  <span
                    className="material-symbols-outlined feed-refresh-icon"
                    aria-hidden
                    style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
                  >
                    sync
                  </span>
                  {messages.list.refreshing}
                </div>
              )}

              <p
                className={cn(
                  'feed-count-label mb-4 px-0.5 text-label-sm text-on-surface-variant',
                  countPulse && 'is-updating',
                )}
              >
                {messages.sheet.itemsInArea(displayCount)}
              </p>

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
            </motion.div>
          )}
        </AnimatePresence>
      </RubberbandScroll>
    </main>
  );
}
