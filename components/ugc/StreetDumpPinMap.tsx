'use client';

import { useEffect, useRef } from 'react';
import Map, { Marker, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  OPENFREEMAP_LIBERTY_STYLE_URL,
  patchOpenFreeMapStyle,
} from '@/lib/map/openfreemap-style';

const VENICE_VIEW = {
  longitude: 12.33,
  latitude: 45.44,
  zoom: 11,
} as const;

type StreetDumpPinMapProps = {
  lat: number;
  lng: number;
  onPinChange: (lat: number, lng: number) => void;
  onPinConfirm: () => void;
  flyTo?: { lat: number; lng: number } | null;
};

export function StreetDumpPinMap({
  lat,
  lng,
  onPinChange,
  onPinConfirm,
  flyTo,
}: StreetDumpPinMapProps) {
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    if (!flyTo) return;
    mapRef.current?.flyTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: 14,
      duration: 800,
    });
  }, [flyTo]);

  return (
    <div className="min-h-[240px] overflow-hidden rounded border border-outline-variant">
      <Map
        ref={mapRef}
        initialViewState={{
          ...VENICE_VIEW,
          longitude: lng,
          latitude: lat,
        }}
        mapStyle={OPENFREEMAP_LIBERTY_STYLE_URL}
        style={{ width: '100%', height: '240px' }}
        attributionControl={{ compact: true }}
        onLoad={(event) => patchOpenFreeMapStyle(event.target)}
      >
        <Marker
          longitude={lng}
          latitude={lat}
          anchor="bottom"
          draggable
          onDragEnd={(event) => {
            onPinChange(event.lngLat.lat, event.lngLat.lng);
            onPinConfirm();
          }}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-accent-orange">
            <div className="h-2 w-2 rounded-full bg-white" />
          </div>
        </Marker>
      </Map>
    </div>
  );
}
