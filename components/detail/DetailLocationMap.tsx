'use client';

import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@/lib/map/maplibreWorker';
import {
  OPENFREEMAP_LIBERTY_STYLE_URL,
  patchOpenFreeMapStyle,
} from '@/lib/map/openfreemap-style';

type DetailLocationMapProps = {
  lat: number;
  lng: number;
};

/** Grayscale read-only map preview for detail sidebar (Stitch LOCATION block). */
export function DetailLocationMap({ lat, lng }: DetailLocationMapProps) {
  return (
    <div className="relative h-32 w-full grayscale">
      <Map
        initialViewState={{
          longitude: lng,
          latitude: lat,
          zoom: 13,
        }}
        mapStyle={OPENFREEMAP_LIBERTY_STYLE_URL}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        interactive={false}
        dragPan={false}
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        onLoad={(event) => patchOpenFreeMapStyle(event.target)}
      >
        <Marker longitude={lng} latitude={lat} anchor="center">
          <div className="h-4 w-4 rounded-full bg-primary ring-4 ring-surface-container-lowest" />
        </Marker>
      </Map>
    </div>
  );
}
