'use client';

import { ZoneFilterChips } from '@/components/map/ZoneFilterChips';
import type { ZoneChip } from '@/lib/listings/types';
import { messages } from '@/messages/it';

type FloatingMapSearchProps = {
  query: string;
  onQueryChange: (query: string) => void;
  selectedZone: ZoneChip;
  onZoneChange: (zone: ZoneChip) => void;
};

/** Stitch map_explorer `.floating-search` — input + zone chips over the map canvas. */
export function FloatingMapSearch({
  query,
  onQueryChange,
  selectedZone,
  onZoneChange,
}: FloatingMapSearchProps) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-space-md z-40 flex w-full max-w-md -translate-x-1/2 flex-col gap-space-sm px-gutter">
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
    </div>
  );
}
