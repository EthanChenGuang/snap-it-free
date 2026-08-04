'use client';

import Image from 'next/image';
import { formatRelativeTimeItalian, messages, zoneLabel } from '@/messages/it';
import type { ListingRow } from '@/lib/listings/types';

type HeroMetadataProps = {
  listing: ListingRow;
};

export function HeroMetadata({ listing }: HeroMetadataProps) {
  const zoneText = listing.zone ? zoneLabel(listing.zone) : messages.listing.approximateZone;
  const postedLabel = formatRelativeTimeItalian(listing.posted_at);

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low">
        {listing.photo_url ? (
          <Image
            src={listing.photo_url}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 1024px) 100vw, 720px"
            unoptimized
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined">image</span>
          </div>
        )}
        <div className="absolute left-space-md top-space-md flex flex-wrap gap-space-sm">
          <span className="rounded bg-primary px-space-sm py-1 text-label-sm font-medium uppercase tracking-wider text-on-primary">
            {messages.detail.verifiedFree}
          </span>
          <span className="rounded bg-surface-container-highest px-space-sm py-1 text-label-sm text-on-surface-variant">
            {postedLabel}
          </span>
        </div>
      </div>

      <div className="border-b border-outline-variant pb-space-lg">
        <h1 className="text-h1-mobile font-bold leading-tight text-on-surface md:text-h1">
          {listing.title}
        </h1>
        <p className="mt-space-xs flex items-center gap-space-xs text-body-lg text-secondary">
          <span className="material-symbols-outlined text-sm">location_on</span>
          {zoneText}
        </p>
      </div>
    </div>
  );
}
