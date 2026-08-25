'use client';

import Image from 'next/image';
import Link from 'next/link';
import { consumerCityLabelsFromMessages } from '@/lib/i18n/city-labels';
import { listingConsumerLocationLabel } from '@/lib/listings/feed-search';
import { useMessages } from '@/lib/i18n/useMessages';
import type { ListingRow } from '@/lib/listings/types';

type SimilarListingsProps = {
  listings: ListingRow[];
};

export function SimilarListings({ listings }: SimilarListingsProps) {
  const { messages, formatRelativeTime } = useMessages();
  const cityLabels = consumerCityLabelsFromMessages(messages);

  if (listings.length === 0) return null;

  return (
    <div className="mt-space-md">
      <h3 className="mb-space-md text-label-sm uppercase tracking-widest text-secondary">
        {messages.detail.similarNearYou}
      </h3>
      <div className="flex flex-col gap-space-sm">
        {listings.map((item) => {
          const locationText = listingConsumerLocationLabel(
            item,
            cityLabels,
            messages.listing.approximateZone,
          );
          return (
            <Link
              key={item.id}
              href={`/listing/${item.id}`}
              className="group flex items-center gap-space-sm rounded-lg p-space-xs transition-colors hover:bg-surface-container"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-surface-variant">
                {item.photo_url ? (
                  <Image
                    src={item.photo_url}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">image</span>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-label-md text-primary group-hover:underline">
                  {item.title}
                </p>
                <p className="text-label-sm text-secondary" suppressHydrationWarning>
                  {locationText} • {formatRelativeTime(item.posted_at)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
