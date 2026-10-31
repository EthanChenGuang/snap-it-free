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
import { checkoutReturnNotice, parseCheckoutParam, urlWithoutCheckoutParam } from '@/lib/paywall/checkout-return';
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

/** First paint batch — keeps DOM light so above-the-fold images win bandwidth. */
const INITIAL_RENDER_COUNT = 24;
/** Cards appended per scroll near the feed bottom. */
const RENDER_STEP = 20;
/** Scroll proximity (px) before loading the next batch. */
const SCROLL_LOAD_AHEAD_PX = 900;

export function FeedHomeClient({
  initialListings,
  initialTotalCount = null,
}: FeedHomeClientProps) {
  const { messages, language } = useMessages();
  const { searchQuery, registerScrollContainer } = useFeedScroll();
  const { applied, sheetOpen } = useFeedFilter();
  const mapModeActive = applied.mode === 'map' && applied.radiusEnabled;
  const { center } = useDistanceCenter(mapModeActive);
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [renderLimit, setRenderLimit] = useState(INITIAL_RENDER_COUNT);

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

  useEffect(() => {
    // Back from a paid Checkout: the unlocked feed says it all, so just drop the ?checkout param.
    const notice = checkoutReturnNotice('open', parseCheckoutParam(window.location.search));
    if (notice !== 'success') return;
    window.history.replaceState(window.history.state, '', urlWithoutCheckoutParam(window.location.href));
  }, []);

  useEffect(() => {
    if (!sheetOpen || !scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
  }, [sheetOpen]);

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

  useEffect(() => {
    setRenderLimit(INITIAL_RENDER_COUNT);
  }, [filterKey]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => {
      const nearBottom =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - SCROLL_LOAD_AHEAD_PX;
      if (!nearBottom) return;

      setRenderLimit((prev) => {
        if (prev >= filteredListings.length) return prev;
        return Math.min(prev + RENDER_STEP, filteredListings.length);
      });
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener('scroll', onScroll);
  }, [filteredListings.length, filterKey]);

  const visibleListings = useMemo(
    () => filteredListings.slice(0, renderLimit),
    [filteredListings, renderLimit],
  );

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
        className="feed-home-scroll no-scrollbar h-full flex-1 px-gutter pt-space-xs pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
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
                  'feed-count-label mb-space-md px-0.5 text-label-sm text-on-surface-variant',
                  countPulse && 'is-updating',
                )}
              >
                {messages.sheet.itemsInArea(displayCount)}
              </p>

              <section className="grid grid-cols-2 gap-x-space-md gap-y-space-lg sm:grid-cols-3 lg:grid-cols-4">
                {visibleListings.map((listing, index) => (
                  <ListListingCard
                    key={listing.id}
                    listing={listing}
                    priority={index < 4}
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
