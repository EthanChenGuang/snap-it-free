'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { ListingRow } from '@/lib/listings/types';

const ListingMap = dynamic(
  () => import('./ListingMap').then((mod) => mod.ListingMap),
  { ssr: false },
);

type MapExplorerProps = {
  initialListings: ListingRow[];
};

export function MapExplorer({ initialListings }: MapExplorerProps) {
  const [listings] = useState(initialListings);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mapListings = useMemo(
    () => listings.filter((l) => l.lat != null && l.lng != null),
    [listings],
  );

  return (
    <main className="map-container relative w-full overflow-hidden bg-surface-container-low">
      <ListingMap
        listings={mapListings}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {listings.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-space-lg z-20 flex justify-center px-gutter">
          <p className="rounded border border-outline-variant bg-surface px-space-md py-space-sm text-label-sm text-on-surface-variant">
            Nessun annuncio attivo — collega Supabase e applica le migration 004.
          </p>
        </div>
      )}
    </main>
  );
}
