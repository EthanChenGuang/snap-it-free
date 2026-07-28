'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { isAllowedExternalUrl, openExternalListingUrl } from '@/lib/listings/external-url';
import { shareListing } from '@/lib/listings/share';
import type { ListingRow } from '@/lib/listings/types';
import { messages } from '@/messages/it';
import { cn } from '@/lib/utils';

type DetailTopBarProps = {
  listing: ListingRow;
};

export function DetailTopBar({ listing }: DetailTopBarProps) {
  const router = useRouter();
  const [shareNotice, setShareNotice] = useState<string | null>(null);
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
      setShareNotice(messages.detail.shareCopied);
    } else if (result === 'shared') {
      setShareNotice(messages.detail.shareShared);
    } else if (result === 'failed') {
      setShareNotice(messages.detail.shareFailed);
    }
    window.setTimeout(() => setShareNotice(null), 2500);
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={messages.detail.favorite}
            disabled
            title={messages.detail.favoriteComingSoon}
          >
            <span className="material-symbols-outlined text-on-surface-variant">favorite</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleShare}
            aria-label={messages.detail.share}
          >
            <span className="material-symbols-outlined text-primary">share</span>
          </Button>
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
      {shareNotice && (
        <p
          className={cn(
            'border-t border-outline-variant bg-surface-container-low px-gutter py-space-xs text-center text-label-sm text-on-surface-variant',
          )}
          role="status"
        >
          {shareNotice}
        </p>
      )}
    </div>
  );
}
