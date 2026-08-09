'use client';

import '@/lib/map/maplibreWorker';
import dynamic from 'next/dynamic';
import { getMessages } from '@/messages';

const mapLoadingLabel = getMessages('zh').post.mapLoading;

const SelectLocationClient = dynamic(
  () =>
    import('@/components/map/SelectLocationClient').then((mod) => mod.SelectLocationClient),
  {
    ssr: false,
    loading: () => (
      <main className="map-container relative flex h-full w-full items-center justify-center overflow-hidden bg-surface-container-low">
        <p className="text-label-sm text-on-surface-variant">{mapLoadingLabel}</p>
      </main>
    ),
  },
);

export function SelectLocationPageClient() {
  return <SelectLocationClient />;
}
