'use client';

import '@/lib/map/maplibreWorker';
import { forwardRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import Map, { type MapRef } from 'react-map-gl/maplibre';
import { LocateMeButton } from '@/components/map/LocateMeButton';

const OPENFREEMAP_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';

export type SelectLocationMapViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

type SelectLocationMapPaneProps = {
  initialViewState: SelectLocationMapViewState;
  onMoveEnd: () => void;
  onLoad: () => void;
};

export const SelectLocationMapPane = forwardRef<MapRef, SelectLocationMapPaneProps>(
  function SelectLocationMapPane({ initialViewState, onMoveEnd, onLoad }, ref) {
    return (
      <Map
        ref={ref}
        initialViewState={initialViewState}
        mapStyle={OPENFREEMAP_LIBERTY}
        style={{ width: '100%', height: '100%' }}
        attributionControl={{ compact: true }}
        onMoveEnd={onMoveEnd}
        onLoad={onLoad}
      >
        <LocateMeButton />
      </Map>
    );
  },
);
