'use client';

import '@/app/listing-detail.css';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { DetailHeroControls } from '@/components/detail/DetailHeroControls';
import { GuestAuthGateCard, cardSpring } from '@/components/detail/GuestAuthGateCard';
import { useListingDistanceMeters } from '@/hooks/useListingDistanceMeters';
import { consumerCityLabelsFromMessages } from '@/lib/i18n/city-labels';
import { resolveListingTitle } from '@/lib/i18n/listing-fields';
import { useMessages } from '@/lib/i18n/useMessages';
import { formatDistance } from '@/lib/geo/format-distance';
import { listingConsumerLocationLabel } from '@/lib/listings/feed-search';
import type { ListingRow } from '@/lib/listings/types';

type DetailPreviewWallProps = {
  listing: ListingRow;
  redirectTo: string;
};

/** Anonymous guest preview — visible teaser + frosted gate overlay + floating auth card (D-19-02). */
export function DetailPreviewWall({ listing, redirectTo }: DetailPreviewWallProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [gateOpen, setGateOpen] = useState(true);

  const { language, messages, formatRelativeTime } = useMessages();
  const displayTitle = resolveListingTitle(listing, language);
  const postedLabel = formatRelativeTime(listing.posted_at);
  const distanceMeters = useListingDistanceMeters(listing);
  const cityLabels = consumerCityLabelsFromMessages(messages);
  const locationLabel = listingConsumerLocationLabel(
    listing,
    cityLabels,
    messages.listing.approximateZone,
  );
  const metadataLine = [
    locationLabel,
    distanceMeters != null ? formatDistance(distanceMeters) : null,
    postedLabel,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  const handleGateClose = useCallback(() => {
    setGateOpen(false);
  }, []);

  const handleGateExitComplete = useCallback(() => {
    if (!gateOpen) {
      router.back();
    }
  }, [gateOpen, router]);

  const handleFavoriteUnauthed = () => {
    setGateOpen(true);
    requestAnimationFrame(() => {
      document.getElementById('guest-gate-email')?.focus({ preventScroll: true });
    });
  };

  const overlayMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };

  return (
    <div className="listing-detail listing-detail-guest-preview flex h-full min-h-0 flex-col overflow-y-auto bg-surface">
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-surface-container-low md:aspect-[4/3]">
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
            <span className="material-symbols-outlined text-4xl" aria-hidden="true">
              image
            </span>
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-transparent"
          aria-hidden="true"
        />

        <DetailHeroControls
          listing={listing}
          showOverflow={false}
          showFavorite
          onFavoriteUnauthed={handleFavoriteUnauthed}
        />
      </div>

      <div className="px-gutter pt-space-lg pb-[calc(env(safe-area-inset-bottom,0px)+var(--spacing-space-lg))]">
        <header className="shrink-0">
          <p className="mb-space-sm">
            <span className="listing-detail-verified-badge">{messages.detail.verifiedFree}</span>
          </p>
          <h1 className="text-h2 font-semibold leading-tight tracking-[-0.01em] text-on-surface">
            {displayTitle}
          </h1>

          {metadataLine ? (
            <p
              className="mt-space-xs text-label-sm text-on-surface-variant tabular-nums"
              suppressHydrationWarning
            >
              {metadataLine}
            </p>
          ) : null}
        </header>

        <div className="listing-detail-guest-gate relative mt-space-lg min-h-[min(420px,52dvh)]">
          <div className="listing-detail-locked-tease pointer-events-none select-none" aria-hidden="true">
            <div className="listing-detail-locked-tease-body space-y-space-md py-space-md">
              <p className="text-body-md text-on-surface">{messages.detail.previewLockedDescription}</p>
              <p className="text-body-md text-on-surface">{messages.detail.previewLockedPickup}</p>
              <div className="flex h-40 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                  map
                </span>
              </div>
            </div>
          </div>

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/85 to-transparent backdrop-blur-md"
            aria-hidden="true"
          />

          <AnimatePresence onExitComplete={handleGateExitComplete}>
            {gateOpen ? (
              <motion.div
                key="guest-auth-gate-layer"
                className="absolute inset-0 z-10 flex items-center justify-center px-gutter py-space-lg"
                {...overlayMotion}
              >
                <motion.div
                  className="pointer-events-auto w-full max-w-sm"
                  {...(reduceMotion
                    ? {}
                    : {
                        initial: { y: 20, scale: 0.96, opacity: 0 },
                        animate: { y: 0, scale: 1, opacity: 1 },
                        exit: { y: 20, scale: 0.96, opacity: 0 },
                        transition: cardSpring,
                      })}
                >
                  <GuestAuthGateCard
                    id="guest-auth-form"
                    redirectTo={redirectTo}
                    onClose={handleGateClose}
                  />
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
