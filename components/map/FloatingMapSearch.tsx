'use client';

import { SubitoCategoryFilterChips } from '@/components/listings/SubitoCategoryFilterChips';
import { ZoneFilterChips } from '@/components/map/ZoneFilterChips';
import type { SubitoCategoryFilter } from '@/lib/listings/subito-categories';
import type { ZoneChip } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type FloatingMapSearchProps = {
  query: string;
  onQueryChange: (query: string) => void;
  selectedZone: ZoneChip;
  onZoneChange: (zone: ZoneChip) => void;
  selectedCategory: SubitoCategoryFilter;
  onCategoryChange: (category: SubitoCategoryFilter) => void;
};

/** Stitch map_explorer `.floating-search` — input + zone + category chips over the map canvas. */
export function FloatingMapSearch({
  query,
  onQueryChange,
  selectedZone,
  onZoneChange,
  selectedCategory,
  onCategoryChange,
}: FloatingMapSearchProps) {
  const { messages } = useMessages();

  return (
    <div className="pointer-events-auto absolute left-1/2 top-space-md z-40 flex w-full max-w-2xl -translate-x-1/2 flex-col gap-space-md px-gutter">
      <div className="flex items-center rounded-lg border border-outline bg-surface px-space-md py-space-sm">
        <span className="material-symbols-outlined mr-space-sm text-on-surface-variant">
          search
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={messages.map.searchPlaceholder}
          aria-label={messages.header.search}
          className="w-full border-none bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-0"
        />
      </div>
      <ZoneFilterChips selectedZone={selectedZone} onZoneChange={onZoneChange} />
      <SubitoCategoryFilterChips
        variant="panel"
        selectedCategory={selectedCategory}
        onCategoryChange={onCategoryChange}
      />
    </div>
  );
}
