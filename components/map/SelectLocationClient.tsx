'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MapRef } from 'react-map-gl/maplibre';
import {
  SelectLocationMapPane,
  type SelectLocationMapViewState,
} from '@/components/map/SelectLocationMapPane';
import { writeBrowseCenter } from '@/lib/browse-center/context';
import { readBrowseCenter } from '@/lib/browse-center/storage';
import { useMessages } from '@/lib/i18n/useMessages';

const PADOVA_CENTER = { lat: 45.41, lng: 11.88 };
const VENICE_CENTER = { lat: 45.44, lng: 12.33 };
const DEFAULT_CENTER = VENICE_CENTER;

function resolveInitialViewState(): SelectLocationMapViewState {
  const saved = readBrowseCenter();
  const center = saved ?? DEFAULT_CENTER;
  return { longitude: center.lng, latitude: center.lat, zoom: 12 };
}

function resolveCityLabel(
  lat: number,
  lng: number,
  cityLabels: { venice: string; padova: string },
): string {
  const padovaDist =
    (lat - PADOVA_CENTER.lat) ** 2 + (lng - PADOVA_CENTER.lng) ** 2;
  const veniceDist =
    (lat - VENICE_CENTER.lat) ** 2 + (lng - VENICE_CENTER.lng) ** 2;
  return padovaDist < veniceDist ? cityLabels.padova : cityLabels.venice;
}

export function SelectLocationClient() {
  const router = useRouter();
  const { messages } = useMessages();
  const mapRef = useRef<MapRef>(null);
  const [initialViewState] = useState(resolveInitialViewState);
  const [center, setCenter] = useState(() => {
    const saved = readBrowseCenter();
    return saved ?? DEFAULT_CENTER;
  });

  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const { lat, lng } = map.getCenter();
    setCenter({ lat, lng });
  }, []);

  const handleConfirm = () => {
    const label = resolveCityLabel(center.lat, center.lng, {
      venice: messages.feed.cityVenice,
      padova: messages.feed.cityPadova,
    });
    writeBrowseCenter({ lat: center.lat, lng: center.lng, label });
    router.push('/');
  };

  return (
    <main className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      <div className="absolute left-0 right-0 top-0 z-10 px-gutter pt-space-md">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mb-space-sm flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg bg-surface/90 text-on-surface shadow-none backdrop-blur-sm"
          aria-label={messages.selectLocation.back}
        >
          <span className="material-symbols-outlined text-[24px]">chevron_left</span>
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <SelectLocationMapPane
          ref={mapRef}
          initialViewState={initialViewState}
          onMoveEnd={handleMoveEnd}
          onLoad={() => {}}
        />

        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div className="-translate-y-4 flex flex-col items-center">
            <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>
            <div className="h-3 w-0.5 bg-primary" />
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-outline-variant bg-surface px-gutter py-space-md pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleConfirm}
          className="min-h-11 w-full rounded-lg bg-primary px-space-md py-space-sm text-label-sm font-semibold text-on-primary transition-opacity active:opacity-90"
        >
          {messages.selectLocation.confirm}
        </button>
      </div>
    </main>
  );
}
