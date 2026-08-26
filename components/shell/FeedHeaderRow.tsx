'use client';

import Link from 'next/link';
import { FilterSheet } from '@/components/listings/FilterSheet';
import { CompactLocaleChip } from '@/components/shell/CompactLocaleChip';
import { useFeedFilter } from '@/components/shell/FeedFilterContext';
import { useFeedScroll } from '@/components/shell/FeedScrollContext';
import { useBrowseCenter } from '@/lib/browse-center/context';
import { useMessages } from '@/lib/i18n/useMessages';
import { getSubitoCategoryLabel } from '@/lib/listings/subito-categories';
import { cn } from '@/lib/utils';

const PILL_CLASS =
  'feed-glass-pill inline-flex items-center gap-space-xs rounded-full px-space-md py-space-xs text-label-sm text-on-surface transition-all duration-300 active:scale-[0.97]';

function truncateSearchQuery(query: string, maxLen = 24): string {
  const trimmed = query.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
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
      <span className="material-symbols-outlined text-label-sm text-on-surface-variant" aria-hidden>
        close
      </span>
    </button>
  );
}

function FeedActiveFilterPills() {
  const { messages, language } = useMessages();
  const { searchQuery, setSearchQuery } = useFeedScroll();
  const { applied, dismissCategory } = useFeedFilter();

  const hasSearchPill = searchQuery.trim().length > 0;
  const hasCategoryPills = applied.categories.length > 0;

  if (!hasSearchPill && !hasCategoryPills) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-space-sm px-5 pb-space-sm sm:px-6">
      {hasSearchPill && (
        <FilterPill
          label={truncateSearchQuery(searchQuery)}
          onDismiss={() => setSearchQuery('')}
          dismissLabel={messages.feed.removeSearchFilter}
        />
      )}

      {applied.categories.map((slug) => {
        const categoryLabel = getSubitoCategoryLabel(slug, language, { messages }) ?? slug;
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
  const { setSheetOpen, hasActiveFilters, applied } = useFeedFilter();
  const browseCenter = useBrowseCenter();
  const showMapLocationIndicator = applied.mode === 'map' && browseCenter !== null;

  return (
    <header
      className={cn(
        'feed-header-glass sticky top-0 z-30 w-full shrink-0 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
        headerHidden &&
          'pointer-events-none max-h-0 overflow-hidden py-0 opacity-0 -translate-y-full',
      )}
    >
      <div className="mx-auto flex max-w-container-max items-center justify-between gap-space-sm px-5 py-space-md sm:px-6">
        <CompactLocaleChip />
        <div className="relative min-w-0 flex-1">
          <span
            className="material-symbols-outlined feed-header-icon pointer-events-none absolute left-space-md top-1/2 -translate-y-1/2 text-on-surface-variant"
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
            className="feed-glass-search min-h-11 w-full rounded-full py-space-sm pl-10 pr-space-md text-body-md text-on-surface transition-all duration-300 placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-on-surface/20"
          />
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.currentTarget.blur();
            setSheetOpen(true);
          }}
          className="feed-glass-icon-btn relative flex h-10 w-10 shrink-0 touch-manipulation cursor-pointer items-center justify-center text-on-surface"
          aria-label={messages.feed.openFilters}
        >
          {hasActiveFilters && (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary"
              aria-hidden
            />
          )}
          <span
            className="material-symbols-outlined feed-header-icon"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
          >
            discover_tune
          </span>
        </button>
        <Link
          href="/select-location"
          className="feed-glass-icon-btn relative flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center text-on-surface"
          aria-label={messages.feed.openSelectLocation}
        >
          {showMapLocationIndicator && (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary"
              aria-hidden
            />
          )}
          <span
            className="material-symbols-outlined feed-header-icon"
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
