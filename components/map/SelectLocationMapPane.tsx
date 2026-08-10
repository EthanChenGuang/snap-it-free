'use client';

import '@/lib/map/maplibreWorker';
import { forwardRef, useCallback } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import Map, { Marker, type MapRef } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import { SelectLocationRedPin } from '@/components/map/SelectLocationRedPin';

const OPENFREEMAP_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';

export const SELECT_LOCATION_MAP_PADDING = { top: 0, bottom: 160, left: 0, right: 0 };

export type SelectLocationMapViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

type SelectLocationMapPaneProps = {
  initialViewState: SelectLocationMapViewState;
  markerPosition: { lat: number; lng: number };
  pinAnimating?: boolean;
  onMapClick: (lat: number, lng: number) => void;
  onLocateMe: () => void;
  locateMeAriaLabel: string;
  onLoad?: () => void;
};

export const SelectLocationMapPane = forwardRef<MapRef, SelectLocationMapPaneProps>(
  function SelectLocationMapPane(
    {
      initialViewState,
      markerPosition,
      pinAnimating = false,
      onMapClick,
      onLocateMe,
      locateMeAriaLabel,
      onLoad,
    },
    ref,
  ) {
    const handleClick = useCallback(
      (event: MapLayerMouseEvent) => {
        onMapClick(event.lngLat.lat, event.lngLat.lng);
      },
      [onMapClick],
    );

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
