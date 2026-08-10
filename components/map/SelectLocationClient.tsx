'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MapRef } from 'react-map-gl/maplibre';
import {
  fitMapToRadius,
  SelectLocationMapPane,
  type SelectLocationMapViewState,
} from '@/components/map/SelectLocationMapPane';
import { applyMapFilterPrefs } from '@/lib/filter-prefs/mode-transitions';
import {
  readFilterPrefs,
  SELECT_LOCATION_RADIUS_OPTIONS,
} from '@/lib/filter-prefs/storage';
import { readBrowseCenter } from '@/lib/browse-center/storage';
import { resolveCityLabel, VENICE_CENTER } from '@/lib/geo/resolve-city-label';
import { readPostDraft, writePostDraft } from '@/lib/post-draft/storage';
import { useMessages } from '@/lib/i18n/useMessages';

const DEFAULT_ZOOM = 14;
const GEO_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 10000 };

function buildViewState(
  lat: number,
  lng: number,
  zoom = DEFAULT_ZOOM,
): SelectLocationMapViewState {
  return { longitude: lng, latitude: lat, zoom };
}

function resolveInitialRadiusKm(): number {
  const prefs = readFilterPrefs();
  if (prefs.mode === 'map' && prefs.radiusEnabled) {
    return prefs.radiusKm;
  }
  return 10;
}

function flyToPin(
  mapRef: MapRef | null,
  coords: { lat: number; lng: number },
): void {
  mapRef?.getMap()?.flyTo({
    center: [coords.lng, coords.lat],
    zoom: DEFAULT_ZOOM,
    duration: 650,
  });
}

export function SelectLocationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const context: 'browse' | 'post' =
    searchParams.get('context') === 'post' ? 'post' : 'browse';
  const { messages } = useMessages();
  const mapRef = useRef<MapRef>(null);
  const gpsRequested = useRef(false);
  const [ready, setReady] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [markerPosition, setMarkerPosition] = useState(VENICE_CENTER);
  const [initialViewState, setInitialViewState] = useState(() =>
    buildViewState(VENICE_CENTER.lat, VENICE_CENTER.lng),
  );
  const [pinAnimating, setPinAnimating] = useState(false);
  const radiusKmRef = useRef(radiusKm);
  radiusKmRef.current = radiusKm;

  const fitToRadius = useCallback(() => {
    fitMapToRadius(mapRef.current, markerPosition, radiusKm);
  }, [markerPosition, radiusKm]);

  const handleRadiusChange = useCallback((km: number) => {
    setRadiusKm(km);
  }, []);

  const triggerPinDrop = useCallback(() => {
    setPinAnimating(true);
    window.setTimeout(() => setPinAnimating(false), 400);
  }, []);

  const applyMarkerPosition = useCallback(
    (coords: { lat: number; lng: number }, fly = false) => {
      setMarkerPosition(coords);
      setInitialViewState(buildViewState(coords.lat, coords.lng));
      if (fly) {
        if (context === 'post') {
          flyToPin(mapRef.current, coords);
        } else {
          fitMapToRadius(mapRef.current, coords, radiusKmRef.current);
        }
      }
    },
    [context],
  );

  useEffect(() => {
    setRadiusKm(resolveInitialRadiusKm());

    const saved =
      context === 'post' ? readPostDraft() : readBrowseCenter();
    if (saved) {
      applyMarkerPosition({ lat: saved.lat, lng: saved.lng });
      setReady(true);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      applyMarkerPosition(VENICE_CENTER);
      setReady(true);
      return;
    }

    if (gpsRequested.current) return;
    gpsRequested.current = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyMarkerPosition(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          true,
        );
        setReady(true);
      },
      () => {
        applyMarkerPosition(VENICE_CENTER);
        setReady(true);
      },
      GEO_OPTIONS,
    );
    // One-time bootstrap only — must not re-run when radiusKm changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setMarkerPosition({ lat, lng });
      triggerPinDrop();
    },
    [triggerPinDrop],
  );

  const handleLocateMe = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setMarkerPosition(coords);
        if (context === 'post') {
          flyToPin(mapRef.current, coords);
        } else {
          fitMapToRadius(mapRef.current, coords, radiusKm);
        }
        triggerPinDrop();
      },
      () => {},
      GEO_OPTIONS,
    );
  }, [context, radiusKm, triggerPinDrop]);

  const handleConfirm = () => {
    const label = resolveCityLabel(markerPosition.lat, markerPosition.lng, {
      venice: messages.feed.cityVenice,
      padova: messages.feed.cityPadova,
    });
    if (context === 'post') {
      writePostDraft({
        lat: markerPosition.lat,
        lng: markerPosition.lng,
        label,
      });
      router.push('/post');
      return;
    }
    applyMapFilterPrefs(
      {
        lat: markerPosition.lat,
        lng: markerPosition.lng,
        label,
      },
      radiusKm,
    );
    router.back();
  };

  return (
    <main className="flex h-full w-full flex-col overflow-hidden bg-background">
      <header className="z-20 shrink-0 border-b border-outline-variant bg-surface">
        <div className="relative flex min-h-14 items-center justify-center px-gutter py-space-sm">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-gutter flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg text-on-surface transition-opacity active:opacity-70"
            aria-label={messages.selectLocation.back}
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <h1 className="text-label-md font-semibold text-on-surface">
            {context === 'post'
              ? messages.selectLocation.postTitle
              : messages.selectLocation.title}
          </h1>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {ready ? (
          <>
            <SelectLocationMapPane
              ref={mapRef}
              initialViewState={initialViewState}
              markerPosition={markerPosition}
              radiusKm={radiusKm}
              radiusOptions={SELECT_LOCATION_RADIUS_OPTIONS}
              radiusLabel={messages.selectLocation.radiusLabel}
              radiusOptionLabel={messages.selectLocation.radiusOption}
              onRadiusChange={handleRadiusChange}
              pinAnimating={pinAnimating}
              onMapClick={handleMapClick}
              onLocateMe={handleLocateMe}
              locateMeAriaLabel={messages.selectLocation.locateMe}
              showRadiusControls={context !== 'post'}
              onFitBounds={context === 'post' ? undefined : fitToRadius}
              onLoad={() => {
                mapRef.current
                  ?.getMap()
                  ?.setPadding({ top: 56, bottom: 160, left: 24, right: 24 });
                if (context === 'post') {
                  flyToPin(mapRef.current, markerPosition);
                } else {
                  fitMapToRadius(mapRef.current, markerPosition, radiusKm);
                }
              }}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-container-low">
            <p className="text-label-sm text-on-surface-variant">
              {messages.post.mapLoading}
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-gutter pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
            <div
              className="mb-space-md flex items-center gap-space-sm rounded-lg border border-outline-variant bg-surface-container-low px-space-md py-space-sm"
              aria-live="polite"
            >
              <span
                className="material-symbols-outlined shrink-0 text-[20px] text-on-surface-variant"
                aria-hidden
              >
                location_on
              </span>
              <span className="text-body-md text-on-surface-variant">
                {ready
                  ? resolveCityLabel(markerPosition.lat, markerPosition.lng, {
                      venice: messages.feed.cityVenice,
                      padova: messages.feed.cityPadova,
                    })
                  : null}
              </span>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!ready}
              className="min-h-11 w-full rounded-lg bg-primary px-space-md py-space-sm text-label-sm font-semibold text-on-primary transition-opacity active:opacity-90 disabled:pointer-events-none disabled:opacity-50"
            >
              {context === 'post'
                ? messages.selectLocation.confirmPickup
                : messages.selectLocation.confirm}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
