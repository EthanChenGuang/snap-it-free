'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DetailOverflowMenu } from '@/components/detail/DetailOverflowMenu';
import { ReportListingMenu } from '@/components/detail/ReportListingMenu';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { toast } from '@/components/ui/toaster';
import { shareListing } from '@/lib/listings/share';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type DetailHeroControlsProps = {
  listing: ListingRow;
  showFavorite?: boolean;
  showOverflow?: boolean;
  onFavoriteUnauthed?: () => void;
};

/** Floating back / favorite / share / more controls on the hero image. */
export function DetailHeroControls({
  listing,
  showFavorite = true,
  showOverflow = true,
  onFavoriteUnauthed,
}: DetailHeroControlsProps) {
  const { messages } = useMessages();
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  const handleShare = async () => {
    const result = await shareListing(listing);
    if (result === 'copied') {
      toast(messages.detail.shareCopied);
    } else if (result === 'shared') {
      toast(messages.detail.shareShared);
    } else if (result === 'failed') {
      toast(messages.detail.shareFailed);
    }
  };

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-space-md">
        <button
          type="button"
          className="listing-detail-hero-btn pointer-events-auto"
          onClick={handleBack}
          aria-label={messages.detail.back}
        >
          <span
            className="material-symbols-outlined text-h3"
            style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
          >
            arrow_back
          </span>
        </button>

        <div className="pointer-events-auto flex items-center gap-space-sm">
          {showFavorite ? (
            <FavoriteButton
              listingId={listing.id}
              size="sm"
              tone="overlay"
              className="h-10 w-10"
              onUnauthenticated={onFavoriteUnauthed}
            />
          ) : null}
          <button
            type="button"
            onClick={handleShare}
            aria-label={messages.detail.share}
            className="listing-detail-hero-btn"
          >
            <span
              className="material-symbols-outlined text-h3"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              share
            </span>
          </button>
          {showOverflow ? (
            <DetailOverflowMenu
              triggerClassName="listing-detail-hero-btn"
              onReport={() => setReportOpen(true)}
            />
          ) : null}
        </div>
      </div>

      <ReportListingMenu
        listingId={listing.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </>
  );
}
