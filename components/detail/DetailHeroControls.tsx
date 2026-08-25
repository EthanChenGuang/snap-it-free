'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DetailOverflowMenu } from '@/components/detail/DetailOverflowMenu';
import { ReportListingMenu } from '@/components/detail/ReportListingMenu';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { shareListing } from '@/lib/listings/share';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type DetailHeroControlsProps = {
  listing: ListingRow;
  showFavorite?: boolean;
  showOverflow?: boolean;
};

/** Floating back / favorite / share / more controls on the hero image. */
export function DetailHeroControls({
  listing,
  showFavorite = true,
  showOverflow = true,
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
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest/90 text-primary backdrop-blur-sm transition hover:bg-surface-container-lowest"
          onClick={handleBack}
          aria-label={messages.detail.back}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        <div className="pointer-events-auto flex items-center gap-space-sm">
          {showFavorite ? (
            <FavoriteButton
              listingId={listing.id}
              size="sm"
              tone="overlay"
              className="h-10 w-10 rounded-full bg-surface-container-lowest/90 p-2 backdrop-blur-sm transition hover:bg-surface-container-lowest"
            />
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleShare}
            aria-label={messages.detail.share}
            className="h-10 w-10 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm transition hover:bg-surface-container-lowest"
          >
            <span className="material-symbols-outlined text-primary">share</span>
          </Button>
          {showOverflow ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest/90 backdrop-blur-sm">
              <DetailOverflowMenu onReport={() => setReportOpen(true)} />
            </div>
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
