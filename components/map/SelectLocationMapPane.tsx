'use client';

import '@/lib/map/maplibreWorker';
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import Map, { Layer, Marker, Source, type MapRef } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import { SelectLocationRedPin } from '@/components/map/SelectLocationRedPin';
import {
  boundsForRadiusKm,
  createCirclePolygon,
  createRadarSector,
} from '@/lib/geo/radius-circle';

const OPENFREEMAP_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';

export const SELECT_LOCATION_MAP_PADDING = { top: 56, bottom: 160, left: 24, right: 24 };

export type SelectLocationMapViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

type SelectLocationMapPaneProps = {
  initialViewState: SelectLocationMapViewState;
  markerPosition: { lat: number; lng: number };
  radiusKm: number;
  pinAnimating?: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onLocateMe: () => void;
  locateMeAriaLabel: string;
  onLoad?: () => void;
  onFitBounds?: () => void;
};

export const SelectLocationMapPane = forwardRef<MapRef, SelectLocationMapPaneProps>(
  function SelectLocationMapPane(
    {
      initialViewState,
      markerPosition,
      radiusKm,
      pinAnimating = false,
      onMapClick,
      onLocateMe,
      locateMeAriaLabel,
      onLoad,
      onFitBounds,
    },
    ref,
  ) {
    const [radarBearing, setRadarBearing] = useState(0);

    useEffect(() => {
      let frame = 0;
      let raf = 0;
      const tick = () => {
        frame += 1;
        setRadarBearing((frame * 1.4) % 360);
        raf = window.requestAnimationFrame(tick);
      };
      raf = window.requestAnimationFrame(tick);
      return () => window.cancelAnimationFrame(raf);
    }, []);

    const circleGeoJson = useMemo(
      (): GeoJSON.Feature => ({
        type: 'Feature',
        properties: {},
        geometry: createCirclePolygon(markerPosition, radiusKm),
      }),
      [markerPosition, radiusKm],
    );

    const radarGeoJson = useMemo(
      (): GeoJSON.Feature => ({
        type: 'Feature',
        properties: {},
        geometry: createRadarSector(markerPosition, radiusKm, radarBearing),
      }),
      [markerPosition, radiusKm, radarBearing],
    );

    const handleClick = useCallback(
      (event: MapLayerMouseEvent) => {
        onMapClick(event.lngLat.lat, event.lngLat.lng);
      },
      [onMapClick],
    );

    useEffect(() => {
      onFitBounds?.();
    }, [markerPosition, radiusKm, onFitBounds]);

    return (
      <div className="relative h-full w-full">
        <Map
          ref={ref}
          initialViewState={initialViewState}
          mapStyle={OPENFREEMAP_LIBERTY}
          style={{ width: '100%', height: '100%' }}
          attributionControl={{ compact: true }}
          padding={SELECT_LOCATION_MAP_PADDING}
          onClick={handleClick}
          onLoad={onLoad}
          cursor="crosshair"
        >
          <Source id="select-radius-circle" type="geojson" data={circleGeoJson}>
            <Layer
              id="select-radius-fill"
              type="fill"
              paint={{
                'fill-color': '#000000',
                'fill-opacity': 0.05,
              }}
            />
            <Layer
              id="select-radius-outline"
              type="line"
              paint={{
                'line-color': '#000000',
                'line-opacity': 0.28,
                'line-width': 1.5,
              }}
            />
          </Source>

          <Source id="select-radius-radar" type="geojson" data={radarGeoJson}>
            <Layer
              id="select-radius-radar-fill"
              type="fill"
              paint={{
                'fill-color': '#EA4335',
                'fill-opacity': 0.14,
              }}
            />
          </Source>

          <Marker
            longitude={markerPosition.lng}
            latitude={markerPosition.lat}
            anchor="bottom"
          >
            <SelectLocationRedPin animate={pinAnimating} />
          </Marker>
        </Map>

        <button
          type="button"
          onClick={onLocateMe}
          aria-label={locateMeAriaLabel}
          className="absolute bottom-[calc(10rem+env(safe-area-inset-bottom,0px))] right-4 z-10 flex h-12 w-12 touch-manipulation items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-lowest shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-opacity active:opacity-90"
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
