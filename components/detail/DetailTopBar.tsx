'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DetailOverflowMenu } from '@/components/detail/DetailOverflowMenu';
import { ReportListingMenu } from '@/components/detail/ReportListingMenu';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { isAllowedExternalUrl, openExternalListingUrl } from '@/lib/listings/external-url';
import { shareListing } from '@/lib/listings/share';
import type { ListingRow } from '@/lib/listings/types';
import { messages } from '@/messages/it';

type DetailTopBarProps = {
  listing: ListingRow;
};

export function DetailTopBar({ listing }: DetailTopBarProps) {
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const canOpenExternal = isAllowedExternalUrl(listing.external_url);

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
    <div className="sticky top-0 z-30 border-b border-outline-variant bg-surface">
      <div className="mx-auto flex max-w-container-max items-center justify-between gap-space-sm px-gutter py-space-sm">
        <div className="flex min-w-0 items-center gap-space-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label={messages.detail.back}
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </Button>
          <span className="truncate text-label-md font-semibold text-on-surface">
            {messages.detail.pageTitle}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-space-xs">
          <FavoriteButton listingId={listing.id} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleShare}
            aria-label={messages.detail.share}
          >
            <span className="material-symbols-outlined text-primary">share</span>
          </Button>
          <DetailOverflowMenu onReport={() => setReportOpen(true)} />
          {canOpenExternal && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => openExternalListingUrl(listing.external_url)}
            >
              {messages.detail.openOnSubito}
            </Button>
          )}
        </div>
      </div>

      <ReportListingMenu
        listingId={listing.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </div>
  );
}
