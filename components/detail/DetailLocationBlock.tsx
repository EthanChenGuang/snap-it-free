'use client';

import dynamic from 'next/dynamic';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

const DetailLocationMap = dynamic(
  () => import('./DetailLocationMap').then((mod) => mod.DetailLocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-32 w-full bg-surface-variant" aria-busy="true" />
    ),
  },
);

type DetailLocationBlockProps = {
  listing: ListingRow;
};

export function DetailLocationBlock({ listing }: DetailLocationBlockProps) {
  const { messages, zoneLabel } = useMessages();

  const zoneText = listing.zone ? zoneLabel(listing.zone) : messages.listing.approximateZone;

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low">
      <div className="flex items-center gap-space-md p-space-md">
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-space-sm">
          <span className="material-symbols-outlined text-primary">map</span>
        </div>
        <div>
          <p className="text-label-sm uppercase tracking-tighter text-secondary">
            {messages.detail.locationTitle}
          </p>
          <p className="text-label-md font-medium text-primary">{zoneText}</p>
        </div>
      </div>
      {listing.lat != null && listing.lng != null && (
        <DetailLocationMap lat={listing.lat} lng={listing.lng} />
      )}
    </div>
  );
}
