'use client';

import '@/app/listing-detail.css';
import Image from 'next/image';
import { DetailHeroControls } from '@/components/detail/DetailHeroControls';
import { AuthPromptForm } from '@/components/ugc/AuthPromptForm';
import { useListingDistanceMeters } from '@/hooks/useListingDistanceMeters';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { useMessages } from '@/lib/i18n/useMessages';
import { formatDistance } from '@/lib/geo/format-distance';
import { listingSourceLabel } from '@/lib/listings/detail-metadata';
import type { ListingRow } from '@/lib/listings/types';

type DetailPreviewWallProps = {
  listing: ListingRow;
  redirectTo: string;
};

const chipClassName =
  'rounded border border-outline-variant bg-surface-container-low px-space-sm py-1 text-label-sm font-semibold text-on-surface';

/** Anonymous guest preview on listing detail — hero, metadata, inline passwordless auth (D-19-02). */
export function DetailPreviewWall({ listing, redirectTo }: DetailPreviewWallProps) {
  const { language, messages, formatRelativeTime, zoneLabel } = useMessages();
  const displayTitle = resolveListingTitle(listing, language);
  const postedLabel = formatRelativeTime(listing.posted_at);
  const distanceMeters = useListingDistanceMeters(listing);
  const sourceLabel =
    listing.source === 'ugc'
      ? messages.listing.sourceCommunity
      : listingSourceLabel({ source: listing.source, messages });

  const handleFavoriteUnauthed = () => {
    const form = document.getElementById('guest-auth-form');
    if (!form) return;
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const focusable = form.querySelector<HTMLElement>('button, input');
    focusable?.focus();
  };

  return (
    <div className="listing-detail flex h-full flex-col overflow-y-auto bg-surface">
      <div className="relative mx-auto w-full max-w-container-max">
        <div className="relative h-[min(36vh,240px)] w-full overflow-hidden bg-surface-container-low md:h-auto md:aspect-[4/3]">
          {listing.photo_url ? (
            <Image
              src={listing.photo_url}
              alt={displayTitle}
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl">image</span>
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface/90"
            aria-hidden="true"
          />

          <div className="pointer-events-none absolute left-space-md top-[calc(2.5rem+2*var(--space-md))] z-10">
            <span className={`${chipClassName} uppercase tracking-wide`}>
              {messages.detail.verifiedFree}
            </span>
          </div>

          <DetailHeroControls
            listing={listing}
            showOverflow={false}
            showFavorite
            onFavoriteUnauthed={handleFavoriteUnauthed}
          />
        </div>

        <div className="px-gutter pt-space-lg">
          <header className="pb-space-md">
            <h1 className="text-h2 font-semibold leading-tight tracking-[-0.01em] text-on-surface">
              {displayTitle}
            </h1>

            <div className="mt-space-xs flex flex-wrap items-center gap-space-sm">
              {listing.zone ? (
                <span className={chipClassName}>{zoneLabel(listing.zone)}</span>
              ) : null}
              {distanceMeters != null ? (
                <span className={chipClassName}>{formatDistance(distanceMeters)}</span>
              ) : null}
              {sourceLabel ? <span className={chipClassName}>{sourceLabel}</span> : null}
              <span
                className="text-label-sm text-on-surface-variant"
                suppressHydrationWarning
              >
                {postedLabel}
              </span>
            </div>

            <p className="mt-space-md text-body-md text-on-surface-variant">
              {messages.detail.previewSubtitle}
            </p>
          </header>
        </div>

        <section className="border-t border-outline-variant px-gutter pb-space-lg pt-space-md">
          <AuthPromptForm
            id="guest-auth-form"
            redirectTo={redirectTo}
            heading={messages.auth.detailTitle}
            description={messages.auth.modalDescription}
          />
        </section>
      </div>
    </div>
  );
}
