'use client';

import Link from 'next/link';
import { FilterSheet } from '@/components/listings/FilterSheet';
import { CompactLocaleChip } from '@/components/shell/CompactLocaleChip';
import { useFeedFilter } from '@/components/shell/FeedFilterContext';
import { useFeedScroll } from '@/components/shell/FeedScrollContext';
import { useDistanceCenter } from '@/hooks/useDistanceCenter';
import { useBrowseCenter } from '@/lib/browse-center/context';
import { clearBrowseCenter } from '@/lib/browse-center/storage';
import { useMessages } from '@/lib/i18n/useMessages';
import { getSubitoCategoryLabel } from '@/lib/listings/subito-categories';
import { cn } from '@/lib/utils';

const PILL_CLASS =
  'inline-flex items-center gap-space-xs rounded-full border border-outline-variant bg-surface-container-lowest px-space-md py-space-xs text-label-sm text-on-surface transition-opacity active:opacity-80';

function truncateSearchQuery(query: string, maxLen = 24): string {
  const trimmed = query.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function cityPillLabel(
  city: 'venice' | 'padova',
  messages: ReturnType<typeof useMessages>['messages'],
): string {
  return city === 'venice' ? messages.feed.cityVenice : messages.feed.cityPadova;
}

function FilterPill({
  label,
  onDismiss,
  dismissLabel,
}: {
  label: string;
  onDismiss: () => void;
  dismissLabel: string;
}) {
  return (
    <button type="button" onClick={onDismiss} className={PILL_CLASS} aria-label={dismissLabel}>
      <span>{label}</span>
      <span className="material-symbols-outlined text-[16px] text-on-surface-variant" aria-hidden>
        close
      </span>
    </button>
  );
}

function CenterFilterPill({
  label,
  onDismiss,
  dismissLabel,
  linkAriaLabel,
}: {
  label: string;
  onDismiss: () => void;
  dismissLabel: string;
  linkAriaLabel: string;
}) {
  return (
    <span className={PILL_CLASS}>
      <Link href="/select-location" className="min-w-0 truncate" aria-label={linkAriaLabel}>
        {label}
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0"
        aria-label={dismissLabel}
      >
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
          close
        </span>
      </button>
    </span>
  );
}

function FeedActiveFilterPills() {
  const { messages, language } = useMessages();
  const { searchQuery, setSearchQuery } = useFeedScroll();
  const { applied, dismissCity, dismissCategory, dismissRadius } = useFeedFilter();
  const browseCenter = useBrowseCenter();
  const { centerSource, requestGps } = useDistanceCenter(applied.radiusEnabled);

  const showCenterPill = centerSource === 'browse' || centerSource === 'gps';
  const centerLabel =
    centerSource === 'browse' && browseCenter?.label
      ? browseCenter.label
      : messages.feed.myLocation;

  const handleClearCenter = () => {
    clearBrowseCenter();
    requestGps();
  };

  const hasSearchPill = searchQuery.trim().length > 0;
  const hasRadiusPill = applied.radiusEnabled;
  const hasCityPill = applied.city !== 'all';
  const hasCategoryPills = applied.categories.length > 0;

  if (
    !hasSearchPill &&
    !showCenterPill &&
    !hasRadiusPill &&
    !hasCityPill &&
    !hasCategoryPills
  ) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-space-sm px-gutter pb-space-sm">
      {hasSearchPill && (
        <FilterPill
          label={truncateSearchQuery(searchQuery)}
          onDismiss={() => setSearchQuery('')}
          dismissLabel={messages.feed.removeSearchFilter}
        />
      )}

      {showCenterPill && (
        <CenterFilterPill
          label={centerLabel}
          onDismiss={handleClearCenter}
          dismissLabel={messages.feed.removeCenterFilter}
          linkAriaLabel={messages.feed.centerPillAriaLabel(centerLabel)}
        />
      )}

      {hasRadiusPill && (
        <FilterPill
          label={messages.feed.withinKm(applied.radiusKm)}
          onDismiss={dismissRadius}
          dismissLabel={messages.feed.removeRadiusFilter}
        />
      )}

      {hasCityPill && applied.city !== 'all' && (
        <FilterPill
          label={cityPillLabel(applied.city, messages)}
          onDismiss={dismissCity}
          dismissLabel={messages.feed.removeFilterAriaLabel(cityPillLabel(applied.city, messages))}
        />
      )}

      {applied.categories.map((slug) => {
        const categoryLabel = getSubitoCategoryLabel(slug, language);
        return (
        <FilterPill
          key={slug}
          label={categoryLabel}
          onDismiss={() => dismissCategory(slug)}
          dismissLabel={messages.feed.removeFilterAriaLabel(categoryLabel)}
        />
        );
      })}
    </div>
  );
}

/** HOME-02 unified feed header: locale chip + search + filter sheet + location (D-04). */
export function FeedHeaderRow() {
  const { messages } = useMessages();
  const { searchQuery, setSearchQuery, headerHidden } = useFeedScroll();
  const { setSheetOpen, hasActiveFilters } = useFeedFilter();

  return (
    <header
      className={cn(
        'relative z-[100] isolate w-full shrink-0 bg-background transition-all duration-200',
        headerHidden &&
          'pointer-events-none max-h-0 overflow-hidden py-0 opacity-0 -translate-y-full',
      )}
    >
      <div className="mx-auto flex max-w-container-max items-center justify-between gap-space-sm px-gutter py-space-md">
        <CompactLocaleChip />
        <div className="relative min-w-0 flex-1">
          <span
            className="material-symbols-outlined pointer-events-none absolute left-space-md top-1/2 -translate-y-1/2 text-[22px] text-on-surface-variant"
            aria-hidden
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
          >
            search
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={messages.feed.searchPlaceholder}
            aria-label={messages.header.search}
            className="min-h-11 w-full rounded-full bg-surface-container-lowest py-space-sm pl-10 pr-space-md text-body-md text-on-surface transition-all placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="relative flex h-10 w-10 shrink-0 touch-manipulation cursor-pointer items-center justify-center rounded-full bg-surface-container-lowest text-on-surface transition-opacity active:opacity-80"
          aria-label={messages.feed.openFilters}
        >
          {hasActiveFilters && (
            <span
              className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary"
              aria-hidden
            />
          )}
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
          >
            discover_tune
          </span>
        </button>
        <Link
          href="/select-location"
          className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-surface-container-lowest text-error transition-opacity active:opacity-80"
          aria-label={messages.feed.openSelectLocation}
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
          >
            pin_drop
          </span>
        </Link>
      </div>
      <FeedActiveFilterPills />
      <FilterSheet />
    </header>
  );
}
