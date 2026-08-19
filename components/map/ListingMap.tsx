'use client';

import { useEffect, useMemo, useRef } from 'react';
import Map, { Marker, Popup, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ListingPopup } from '@/components/listings/ListingPopup';
import {
  OPENFREEMAP_LIBERTY_STYLE_URL,
  patchOpenFreeMapStyle,
} from '@/lib/map/openfreemap-style';
import { LocateMeButton } from './LocateMeButton';
import type { ListingRow } from '@/lib/listings/types';

type ListingMapProps = {
  listings: ListingRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  flyToListingId?: string | null;
};

function StitchPin({
  listing,
  isSelected,
}: {
  listing: ListingRow;
  isSelected: boolean;
}) {
  return (
    <div className="group flex cursor-pointer flex-col items-center">
      <div
        className={`mb-1 max-w-[140px] truncate rounded-sm bg-primary px-2 py-0.5 text-[10px] font-bold text-on-primary transition-all duration-300 ${
          isSelected ? 'opacity-100 -translate-y-1' : 'opacity-0 group-hover:opacity-100 group-hover:-translate-y-1'
        }`}
      >
        {listing.title.slice(0, 24)}
      </div>
      <div
        className={`flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface bg-accent-orange transition-transform ${
          isSelected ? 'scale-125' : 'group-hover:scale-125'
        }`}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-white" />
      </div>
    </div>
  );
}

export function ListingMap({
  listings,
  selectedId,
  onSelect,
  flyToListingId,
}: ListingMapProps) {
  const mapRef = useRef<MapRef>(null);

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.id === selectedId) ?? null,
    [listings, selectedId],
  );

  useEffect(() => {
    if (!flyToListingId) return;
    const listing = listings.find((item) => item.id === flyToListingId);
    if (listing?.lat == null || listing?.lng == null) return;

    mapRef.current?.flyTo({
      center: [listing.lng, listing.lat],
      zoom: 14,
      duration: 800,
    });
  }, [flyToListingId, listings]);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: 12.33,
        latitude: 45.44,
        zoom: 11,
      }}
      mapStyle={OPENFREEMAP_LIBERTY_STYLE_URL}
      style={{ width: '100%', height: '100%' }}
      attributionControl={{ compact: true }}
      onLoad={(event) => patchOpenFreeMapStyle(event.target)}
    >
      <LocateMeButton />

      {listings.map((listing) => {
        if (listing.lat == null || listing.lng == null) {
          return null;
        }

        return (
          <Marker
            key={listing.id}
            longitude={listing.lng}
            latitude={listing.lat}
            anchor="bottom"
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              onSelect(selectedId === listing.id ? null : listing.id);
            }}
          >
            <StitchPin listing={listing} isSelected={selectedId === listing.id} />
          </Marker>
        );
      })}

      {selectedListing?.lat != null && selectedListing.lng != null && (
        <Popup
          longitude={selectedListing.lng}
          latitude={selectedListing.lat}
          anchor="bottom"
          offset={24}
          closeButton={false}
          onClose={() => onSelect(null)}
          className="listing-popup"
        >
          <ListingPopup listing={selectedListing} />
        </Popup>
      )}
    </Map>
  );
}
