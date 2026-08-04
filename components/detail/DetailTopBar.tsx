'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DetailOverflowMenu } from '@/components/detail/DetailOverflowMenu';
import { ReportListingMenu } from '@/components/detail/ReportListingMenu';
import { FavoriteButton } from '@/components/listings/FavoriteButton';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { shareListing } from '@/lib/listings/share';
import type { ListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type DetailTopBarProps = {
  listing: ListingRow;
};

/** Stitch item_details nav: back + title … heart, share, more. */
export function DetailTopBar({ listing }: DetailTopBarProps) {
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
    <nav className="sticky top-0 z-40 border-b border-outline-variant bg-surface">
      <div className="mx-auto flex max-w-container-max items-center justify-between px-gutter py-space-md">
        <div className="flex items-center gap-space-md">
          <button
            type="button"
            className="rounded p-space-xs transition-colors hover:bg-surface-container active:opacity-80"
            onClick={handleBack}
            aria-label={messages.detail.back}
          >
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <Link href="/" className="text-h3 font-bold text-primary transition-opacity hover:opacity-80">
            {messages.app.title}
          </Link>
        </div>

        <div className="flex items-center gap-space-md">
          <FavoriteButton listingId={listing.id} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleShare}
            aria-label={messages.detail.share}
            className="rounded p-space-xs hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-primary">share</span>
          </Button>
          <DetailOverflowMenu onReport={() => setReportOpen(true)} />
        </div>
      </div>

      <ReportListingMenu
        listingId={listing.id}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </nav>
  );
}
