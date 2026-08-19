'use client';

import '@/lib/map/maplibreWorker';
import dynamic from 'next/dynamic';
import { getMessages } from '@/messages';
import type { ListingRow } from '@/lib/listings/types';

const mapLoadingLabel = getMessages('zh').post.mapLoading;

const MapExplorer = dynamic(
  () => import('@/components/map/MapExplorer').then((mod) => mod.MapExplorer),
  {
    ssr: false,
    loading: () => (
      <main className="map-container relative flex w-full items-center justify-center overflow-hidden bg-surface-container-low">
        <p className="text-label-sm text-on-surface-variant">{mapLoadingLabel}</p>
      </main>
    ),
  },
);

type MapHomeClientProps = {
  initialListings: ListingRow[];
};

export function MapHomeClient({ initialListings }: MapHomeClientProps) {
  return <MapExplorer initialListings={initialListings} />;
}
