'use client';

import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ListingRow } from '@/lib/listings/types';

const OPENFREEMAP_LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';

type ListingMapProps = {
  listings: ListingRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
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
        className={`flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface bg-primary transition-transform ${
          isSelected ? 'scale-125' : 'group-hover:scale-125'
        }`}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-white" />
      </div>
    </div>
  );
}

export function ListingMap({ listings, selectedId, onSelect }: ListingMapProps) {
  return (
    <Map
      initialViewState={{
        longitude: 12.33,
        latitude: 45.44,
        zoom: 11,
      }}
      mapStyle={OPENFREEMAP_LIBERTY}
      style={{ width: '100%', height: '100%' }}
      attributionControl={{ compact: true }}
    >
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
    </Map>
  );
}
