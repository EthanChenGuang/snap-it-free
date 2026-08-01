'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ListingFeed } from '@/components/listings/ListingFeed';
import { excludeReportedIds, filterByZone, filterMapListings } from '@/lib/listings/filters';
import { useListingsPoll } from '@/lib/listings/useListingsPoll';
import { readReportedIds, REPORTS_CHANGE_EVENT } from '@/lib/reports/storage';
import { messages } from '@/messages/it';
import type { ListingRow, ZoneChip } from '@/lib/listings/types';
import { ZoneFilterChips } from './ZoneFilterChips';

const ListingMap = dynamic(
  () => import('./ListingMap').then((mod) => mod.ListingMap),
  { ssr: false },
);

type MapExplorerProps = {
  initialListings: ListingRow[];
};

export function MapExplorer({ initialListings }: MapExplorerProps) {
  const { listings } = useListingsPoll(initialListings, 300000);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneChip>('All');
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(0.25);
  const [flyToListingId, setFlyToListingId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<string[]>([]);

  useEffect(() => {
    setReportedIds(readReportedIds());
    const handleReportsChange = () => setReportedIds(readReportedIds());
    window.addEventListener(REPORTS_CHANGE_EVENT, handleReportsChange);
    return () => window.removeEventListener(REPORTS_CHANGE_EVENT, handleReportsChange);
  }, []);

  const filteredListings = useMemo(
    () => excludeReportedIds(filterByZone(listings, selectedZone), reportedIds),
    [listings, selectedZone, reportedIds],
  );

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

  return (
    <main className="map-container relative w-full overflow-hidden bg-surface-container-low">
      <ListingMap
        listings={mapListings}
        selectedId={selectedId}
        onSelect={handlePinSelect}
        flyToListingId={flyToListingId}
      />

      <div className="pointer-events-auto absolute inset-x-0 top-space-md z-30 px-gutter">
        <ZoneFilterChips selectedZone={selectedZone} onZoneChange={handleZoneChange} />
      </div>

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
        snapPoints={[0.25, 0.75]}
        activeSnapPoint={activeSnapPoint}
        setActiveSnapPoint={setActiveSnapPoint}
      >
        <DrawerContent className="h-full max-h-[95dvh]">
          <ListingFeed listings={filteredListings} selectedId={selectedId} />
        </DrawerContent>
      </Drawer>
    </main>
  );
}
