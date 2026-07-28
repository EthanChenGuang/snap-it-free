'use client';

import { GeolocateControl } from 'react-map-gl/maplibre';

export function LocateMeButton() {
  return (
    <GeolocateControl
      position="bottom-right"
      trackUserLocation={false}
      showUserLocation
    />
  );
}
