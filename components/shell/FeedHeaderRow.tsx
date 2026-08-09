'use client';

import Link from 'next/link';
import { CompactLocaleChip } from '@/components/shell/CompactLocaleChip';
import { useFeedScroll } from '@/components/shell/FeedScrollContext';
import { toast } from '@/components/ui/toaster';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

/** HOME-02 unified feed header: locale chip + search + filter stub + location (D-04). */
export function FeedHeaderRow() {
  const { messages } = useMessages();
  const { searchQuery, setSearchQuery, headerHidden } = useFeedScroll();

  return (
    <header
      className={cn(
        'relative z-[100] isolate w-full shrink-0 border-b border-outline-variant bg-surface transition-all duration-200',
        headerHidden &&
          'pointer-events-none max-h-0 overflow-hidden border-b-0 py-0 opacity-0 -translate-y-full',
      )}
    >
      <div className="mx-auto flex max-w-container-max items-center gap-space-sm px-gutter py-space-md">
        <CompactLocaleChip />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={messages.feed.searchPlaceholder}
          aria-label={messages.header.search}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-space-md text-body-md text-on-surface transition-all placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={() => toast(messages.feed.filterComingSoon)}
          className="flex min-h-11 min-w-11 shrink-0 touch-manipulation cursor-pointer items-center justify-center rounded-lg text-on-surface transition-opacity active:opacity-80"
          aria-label={messages.feed.openFilters}
        >
          <span className="material-symbols-outlined text-[24px]">tune</span>
        </button>
        <Link
          href="/select-location"
          className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-on-surface transition-opacity active:opacity-80"
          aria-label={messages.feed.openSelectLocation}
        >
          <span className="material-symbols-outlined text-[24px]">my_location</span>
        </Link>
      </div>
    </header>
  );
}
