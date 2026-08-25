'use client';

import { useEffect, useMemo, useState } from 'react';
import { SubitoCategoryFilterChips } from '@/components/listings/SubitoCategoryFilterChips';
import { ListListingCard } from '@/components/listings/ListListingCard';
import { excludeReportedIds } from '@/lib/listings/filters';
import {
  matchesSubitoCategory,
  type SubitoCategoryFilter,
} from '@/lib/listings/subito-categories';
import { useListingsPoll } from '@/lib/listings/useListingsPoll';
import { readReportedIds, REPORTS_CHANGE_EVENT } from '@/lib/reports/storage';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type ListPageClientProps = {
  initialListings: ListingRow[];
};

export function ListPageClient({ initialListings }: ListPageClientProps) {
  const { messages } = useMessages();

  const { listings } = useListingsPoll(initialListings);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SubitoCategoryFilter>('all');
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
      if (!matchesSubitoCategory(listing, selectedCategory)) return false;
      if (!query) return true;
      return listing.title.toLowerCase().includes(query);
    });
  }, [listings, reportedIds, searchQuery, selectedCategory]);

  return (
    <main className="flex h-full flex-col overflow-hidden bg-background">
      <section className="shrink-0 px-gutter pb-space-md pt-space-lg">
        <div className="relative mb-space-lg w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={messages.list.searchPlaceholder}
            aria-label={messages.header.search}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-3 pl-12 pr-4 text-body-md text-on-surface transition-all placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <SubitoCategoryFilterChips
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </section>

      <div className="no-scrollbar flex-1 overflow-y-auto px-gutter pb-space-lg">
        {filteredListings.length === 0 ? (
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
          <section className="grid grid-cols-1 gap-space-lg md:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing, index) => (
              <ListListingCard key={listing.id} listing={listing} priority={index < 6} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
