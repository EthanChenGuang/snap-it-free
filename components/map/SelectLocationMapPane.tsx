'use client';

import '@/lib/map/maplibreWorker';
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import Map, { Layer, Source, type MapRef } from 'react-map-gl/maplibre';
import type { GeoJSONSource, MapLayerMouseEvent, Map as MapLibreMap } from 'maplibre-gl';
import { SelectLocationRedPin } from '@/components/map/SelectLocationRedPin';
import {
  boundsForRadiusKm,
  createCirclePolygon,
  createRadarSector,
} from '@/lib/geo/radius-circle';
import {
  OPENFREEMAP_LIBERTY_STYLE_URL,
  patchOpenFreeMapStyle,
} from '@/lib/map/openfreemap-style';
import { cn } from '@/lib/utils';

export const SELECT_LOCATION_MAP_PADDING = { top: 56, bottom: 160, left: 24, right: 24 };

/** Minimalist dark/white palette for radius + radar overlays. */
const RADIUS_VISUAL = {
  fillColor: '#ffffff',
  fillOpacity: 0.06,
  outlineColor: '#1a1c1c',
  outlineOpacity: 0.18,
  outlineWidth: 1,
  radarOuterColor: '#1a1c1c',
  radarOuterOpacity: 0.045,
  radarOuterSpread: 52,
  radarInnerColor: '#1a1c1c',
  radarInnerOpacity: 0.08,
  radarInnerSpread: 26,
} as const;

export type SelectLocationMapViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

type SelectLocationMapPaneProps = {
  initialViewState: SelectLocationMapViewState;
  markerPosition: { lat: number; lng: number };
  radiusKm: number;
  radiusOptions: readonly number[];
  radiusLabel: string;
  radiusOptionLabel: (km: number) => string;
  onRadiusChange: (km: number) => void;
  pinAnimating?: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onLocateMe: () => void;
  locateMeAriaLabel: string;
  showRadiusControls?: boolean;
  onLoad?: () => void;
  onFitBounds?: () => void;
};

function SelectLocationPinOverlay({
  mapRef,
  position,
  animate,
  mapReady,
}: {
  mapRef: RefObject<MapRef | null>;
  position: { lat: number; lng: number };
  animate?: boolean;
  mapReady: boolean;
}) {
  const [pixel, setPixel] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const update = () => {
      const projected = map.project([position.lng, position.lat]);
      setPixel({ x: projected.x, y: projected.y });
    };

    update();
    map.on('move', update);
    map.on('zoom', update);
    map.on('resize', update);
    return () => {
      map.off('move', update);
      map.off('zoom', update);
      map.off('resize', update);
    };
  }, [mapRef, mapReady, position.lat, position.lng]);

  if (!pixel) return null;

  return (
    <div
      className="pointer-events-none absolute z-[25]"
      style={{
        left: pixel.x,
        top: pixel.y,
        transform: 'translate(-50%, -100%)',
      }}
      aria-hidden
    >
      <SelectLocationRedPin animate={animate} />
    </div>
  );
}

function startRadarAnimation(
  map: MapLibreMap,
  center: { lat: number; lng: number },
  radiusKm: number,
): () => void {
  let frame = 0;
  let raf = 0;

  const tick = () => {
    frame += 1;
    const bearing = (frame * 1.1) % 360;

    const outer = map.getSource('select-radius-radar-outer') as GeoJSONSource | undefined;
    const inner = map.getSource('select-radius-radar-inner') as GeoJSONSource | undefined;

    if (outer) {
      outer.setData({
        type: 'Feature',
        properties: {},
        geometry: createRadarSector(
          center,
          radiusKm,
          bearing,
          RADIUS_VISUAL.radarOuterSpread,
        ),
      });
    }

    if (inner) {
      inner.setData({
        type: 'Feature',
        properties: {},
        geometry: createRadarSector(
          center,
          radiusKm,
          bearing,
          RADIUS_VISUAL.radarInnerSpread,
        ),
      });
    }

    raf = window.requestAnimationFrame(tick);
  };

  raf = window.requestAnimationFrame(tick);
  return () => window.cancelAnimationFrame(raf);
}

export const SelectLocationMapPane = forwardRef<MapRef, SelectLocationMapPaneProps>(
  function SelectLocationMapPane(
    {
      initialViewState,
      markerPosition,
      radiusKm,
      radiusOptions,
      radiusLabel,
      radiusOptionLabel,
      onRadiusChange,
      pinAnimating = false,
      onMapClick,
      onLocateMe,
      locateMeAriaLabel,
      showRadiusControls = true,
      onLoad,
      onFitBounds,
    },
    ref,
  ) {
    const mapInstanceRef = useRef<MapLibreMap | null>(null);
    const onFitBoundsRef = useRef(onFitBounds);
    const [mapReady, setMapReady] = useState(false);
    onFitBoundsRef.current = onFitBounds;

    const circleGeoJson = useMemo(
      (): GeoJSON.Feature => ({
        type: 'Feature',
        properties: {},
        geometry: createCirclePolygon(markerPosition, radiusKm),
      }),
      [markerPosition, radiusKm],
    );

    const initialRadarOuter = useMemo(
      (): GeoJSON.Feature => ({
        type: 'Feature',
        properties: {},
        geometry: createRadarSector(
          markerPosition,
          radiusKm,
          0,
          RADIUS_VISUAL.radarOuterSpread,
        ),
      }),
      [markerPosition, radiusKm],
    );

    const initialRadarInner = useMemo(
      (): GeoJSON.Feature => ({
        type: 'Feature',
        properties: {},
        geometry: createRadarSector(
          markerPosition,
          radiusKm,
          0,
          RADIUS_VISUAL.radarInnerSpread,
        ),
      }),
      [markerPosition, radiusKm],
    );

    const handleClick = useCallback(
      (event: MapLayerMouseEvent) => {
        onMapClick(event.lngLat.lat, event.lngLat.lng);
      },
      [onMapClick],
    );

    const handleMapLoad = useCallback(
      (event: { target: MapLibreMap }) => {
        patchOpenFreeMapStyle(event.target);
        mapInstanceRef.current = event.target;
        setMapReady(true);
        onLoad?.();
      },
      [onLoad],
    );

    useEffect(() => {
      if (!mapReady) return;
      onFitBoundsRef.current?.();
    }, [mapReady, markerPosition.lat, markerPosition.lng, radiusKm]);

    useEffect(() => {
      if (!mapReady || !showRadiusControls) return;
      const map = mapInstanceRef.current;
      if (!map) return;
      return startRadarAnimation(map, markerPosition, radiusKm);
    }, [mapReady, markerPosition, radiusKm, showRadiusControls]);

    const handleRadiusSelect = useCallback(
      (km: number) => {
        onRadiusChange(km);
      },
      [onRadiusChange],
    );

    return (
      <div className="relative isolate h-full w-full">
        <div className="absolute inset-0 z-0">
          <Map
            ref={ref}
            initialViewState={initialViewState}
            mapStyle={OPENFREEMAP_LIBERTY_STYLE_URL}
            style={{ width: '100%', height: '100%' }}
            attributionControl={{ compact: true }}
            padding={SELECT_LOCATION_MAP_PADDING}
            onClick={handleClick}
            onLoad={handleMapLoad}
            cursor="crosshair"
          >
            {showRadiusControls && (
              <>
                <Source id="select-radius-circle" type="geojson" data={circleGeoJson}>
                  <Layer
                    id="select-radius-fill"
                    type="fill"
                    paint={{
                      'fill-color': RADIUS_VISUAL.fillColor,
                      'fill-opacity': RADIUS_VISUAL.fillOpacity,
                    }}
                  />
                  <Layer
                    id="select-radius-outline"
                    type="line"
                    paint={{
                      'line-color': RADIUS_VISUAL.outlineColor,
                      'line-opacity': RADIUS_VISUAL.outlineOpacity,
                      'line-width': RADIUS_VISUAL.outlineWidth,
                    }}
                  />
                </Source>

                <Source id="select-radius-radar-outer" type="geojson" data={initialRadarOuter}>
                  <Layer
                    id="select-radius-radar-outer-fill"
                    type="fill"
                    paint={{
                      'fill-color': RADIUS_VISUAL.radarOuterColor,
                      'fill-opacity': RADIUS_VISUAL.radarOuterOpacity,
                    }}
                  />
                </Source>

                <Source id="select-radius-radar-inner" type="geojson" data={initialRadarInner}>
                  <Layer
                    id="select-radius-radar-inner-fill"
                    type="fill"
                    paint={{
                      'fill-color': RADIUS_VISUAL.radarInnerColor,
                      'fill-opacity': RADIUS_VISUAL.radarInnerOpacity,
                    }}
                  />
                </Source>
              </>
            )}
          </Map>
        </div>

        <SelectLocationPinOverlay
          mapRef={ref as RefObject<MapRef | null>}
          position={markerPosition}
          animate={pinAnimating}
          mapReady={mapReady}
        />

        {showRadiusControls && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-gutter">
            <div
              className="pointer-events-auto flex gap-1 rounded-full border border-outline-variant bg-surface-container-lowest p-1 shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
              role="group"
              aria-label={radiusLabel}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {radiusOptions.map((km) => {
                const active = radiusKm === km;
                return (
                  <button
                    key={km}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRadiusSelect(km);
                    }}
                    className={cn(
                      'min-h-9 touch-manipulation rounded-full px-space-md py-space-xs text-label-sm font-normal transition-colors',
                      active
                        ? 'bg-primary text-on-primary'
                        : 'text-on-surface hover:bg-surface-container-low',
                    )}
                    aria-pressed={active}
                  >
                    {radiusOptionLabel(km)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onLocateMe}
          aria-label={locateMeAriaLabel}
          className="absolute bottom-[calc(10rem+env(safe-area-inset-bottom,0px))] right-4 z-20 flex h-12 w-12 touch-manipulation items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-lowest transition-opacity active:opacity-90"
        >
          <span className="material-symbols-outlined text-[22px] text-on-surface">
            my_location
          </span>
        </button>
      </div>
    );
  },
);

export function fitMapToRadius(
  mapRef: MapRef | null,
  center: { lat: number; lng: number },
  radiusKm: number,
): void {
  const map = mapRef?.getMap();
  if (!map) return;
  const bounds = boundsForRadiusKm(center, radiusKm);
  map.fitBounds(bounds, {
    padding: SELECT_LOCATION_MAP_PADDING,
    duration: 650,
    maxZoom: 15,
  });
}
