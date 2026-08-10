'use client';

import Link from 'next/link';
import { CompactLocaleChip } from '@/components/shell/CompactLocaleChip';
import { useFeedScroll } from '@/components/shell/FeedScrollContext';
import { toast } from '@/components/ui/toaster';
import { useMessages } from '@/lib/i18n/useMessages';
import { getSubitoCategoryLabel } from '@/lib/listings/subito-categories';
import { cn } from '@/lib/utils';

function FeedActiveFilterPills() {
  const { language } = useMessages();
  const { selectedCategory, setSelectedCategory } = useFeedScroll();

  if (selectedCategory === 'all') {
    return null;
  }

  const label = getSubitoCategoryLabel(selectedCategory, language);

  return (
    <div className="flex flex-wrap gap-space-sm px-gutter pb-space-sm">
      <button
        type="button"
        onClick={() => setSelectedCategory('all')}
        className="inline-flex items-center gap-space-xs rounded-full border border-outline-variant bg-surface-container-lowest px-space-md py-space-xs text-label-sm text-on-surface transition-opacity active:opacity-80"
        aria-label={`Remove ${label} filter`}
      >
        <span>{label}</span>
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
          close
        </span>
      </button>
    </div>
  );
}

/** HOME-02 unified feed header: locale chip + search + filter stub + location (D-04). */
export function FeedHeaderRow() {
  const { messages } = useMessages();
  const { searchQuery, setSearchQuery, headerHidden } = useFeedScroll();

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
          onClick={() => toast(messages.feed.filterComingSoon)}
          className="flex h-10 w-10 shrink-0 touch-manipulation cursor-pointer items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-sm transition-opacity active:opacity-80"
          aria-label={messages.feed.openFilters}
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
          >
            discover_tune
          </span>
        </button>
        <Link
          href="/select-location"
          className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-surface-container-lowest text-error shadow-sm transition-opacity active:opacity-80"
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
    </header>
  );
}
