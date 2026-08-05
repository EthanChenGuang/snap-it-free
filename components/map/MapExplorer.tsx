'use client';

import { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ListingFeed } from '@/components/listings/ListingFeed';
import { FloatingMapSearch } from '@/components/map/FloatingMapSearch';
import { ListingMap } from '@/components/map/ListingMap';
import { excludeReportedIds, filterByZone, filterMapListings } from '@/lib/listings/filters';
import { matchesSubitoCategory, type SubitoCategoryFilter } from '@/lib/listings/subito-categories';
import { useListingsPoll } from '@/lib/listings/useListingsPoll';
import { readReportedIds, REPORTS_CHANGE_EVENT } from '@/lib/reports/storage';
import { useMapSearchOpen } from '@/lib/ui/map-search-ui';
import { useMessages } from '@/lib/i18n/useMessages';
import type { ListingRow, ZoneChip } from '@/lib/listings/types';

type MapExplorerProps = {
  initialListings: ListingRow[];
};

export function MapExplorer({ initialListings }: MapExplorerProps) {
  const { messages } = useMessages();

  const { listings } = useListingsPoll(initialListings, 300000);
  const searchOpen = useMapSearchOpen();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneChip>('All');
  const [selectedCategory, setSelectedCategory] = useState<SubitoCategoryFilter>('all');
  const [query, setQuery] = useState('');
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(0.25);
  const [flyToListingId, setFlyToListingId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<string[]>([]);

  useEffect(() => {
    setReportedIds(readReportedIds());
    const handleReportsChange = () => setReportedIds(readReportedIds());
    window.addEventListener(REPORTS_CHANGE_EVENT, handleReportsChange);
    return () => window.removeEventListener(REPORTS_CHANGE_EVENT, handleReportsChange);
  }, []);

  const filteredListings = useMemo(() => {
    const byZone = excludeReportedIds(filterByZone(listings, selectedZone), reportedIds);
    const byCategory = byZone.filter((listing) =>
      matchesSubitoCategory(listing, selectedCategory),
    );
    const trimmed = query.trim();
    if (!trimmed) return byCategory;
    const needle = trimmed.toLowerCase();
    return byCategory.filter((listing) => listing.title.toLowerCase().includes(needle));
  }, [listings, selectedZone, selectedCategory, reportedIds, query]);

  const mapListings = useMemo(
    () => filterMapListings(filteredListings),
    [filteredListings],
  );

  useEffect(() => {
    document.body.style.pointerEvents = 'auto';
    return () => {
      document.body.style.removeProperty('pointer-events');
    };
  }, []);

  const handlePinSelect = (id: string | null) => {
    setSelectedId(id);
    if (!id) return;
    const listing = filteredListings.find((item) => item.id === id);
    if (listing?.lat != null && listing?.lng != null) {
      setFlyToListingId(id);
    }
  };

  const handleZoneChange = (zone: ZoneChip) => {
    setSelectedZone(zone);
    setSelectedId(null);
    setFlyToListingId(null);
  };

  const handleCategoryChange = (category: SubitoCategoryFilter) => {
    setSelectedCategory(category);
    setSelectedId(null);
    setFlyToListingId(null);
  };

  const isSheetExpanded = activeSnapPoint === 0.75;

  const toggleSheet = () => {
    setActiveSnapPoint(isSheetExpanded ? 0.25 : 0.75);
  };

  return (
    <main className="map-container relative w-full overflow-hidden bg-surface-container-low">
      <ListingMap
        listings={mapListings}
        selectedId={selectedId}
        onSelect={handlePinSelect}
        flyToListingId={flyToListingId}
      />

      {searchOpen && (
        <FloatingMapSearch
          query={query}
          onQueryChange={setQuery}
          selectedZone={selectedZone}
          onZoneChange={handleZoneChange}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />
      )}

      {listings.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-space-xl z-20 flex justify-center px-gutter">
          <p className="rounded border border-outline-variant bg-surface px-space-md py-space-sm text-label-sm text-on-surface-variant">
            {messages.empty.noListings}
          </p>
        </div>
      )}

      <Drawer
        open
        modal={false}
        dismissible={false}
        handleOnly
        snapPoints={[0.25, 0.75]}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={setActiveSnapPoint}
      >
        <DrawerContent
          nonModal
          className="max-h-[95dvh]"
          handleAriaLabel={
            isSheetExpanded ? messages.sheet.collapseSheet : messages.sheet.expandSheet
          }
          onHandleClick={toggleSheet}
          handleHintActive={!isSheetExpanded}
        >
          <ListingFeed listings={filteredListings} selectedId={selectedId} />
        </DrawerContent>
      </Drawer>
    </main>
  );
}
