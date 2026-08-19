'use client';

import { useEffect, useRef } from 'react';
import Map, { Marker, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ZONE_CENTERS } from '@/lib/geo/zone-centers';
import {
  OPENFREEMAP_LIBERTY_STYLE_URL,
  patchOpenFreeMapStyle,
} from '@/lib/map/openfreemap-style';
import type { VeniceZone } from '@/lib/listings/types';

type PinMapProps = {
  zone: VeniceZone;
  lat: number;
  lng: number;
  onPinChange: (lat: number, lng: number) => void;
};

export function PinMap({ zone, lat, lng, onPinChange }: PinMapProps) {
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    const center = ZONE_CENTERS[zone];
    onPinChange(center.lat, center.lng);
    mapRef.current?.flyTo({
      center: [center.lng, center.lat],
      zoom: 13,
      duration: 600,
    });
  }, [zone, onPinChange]);

  return (
    <div className="h-48 overflow-hidden rounded border border-outline-variant">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: lng,
          latitude: lat,
          zoom: 13,
        }}
        mapStyle={OPENFREEMAP_LIBERTY_STYLE_URL}
        style={{ width: '100%', height: '100%' }}
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
          }}
        >
          <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface bg-primary">
            <div className="h-1.5 w-1.5 rounded-full bg-white" />
          </div>
        </Marker>
      </Map>
    </div>
  );
}
