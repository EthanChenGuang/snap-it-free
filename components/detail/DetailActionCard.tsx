'use client';

import { Button } from '@/components/ui/button';
import { useMessages } from '@/lib/i18n/useMessages';

type DetailActionCardProps = {
  isAvailable: boolean;
  isUgc: boolean;
  onClaim: () => void;
  onMessage: () => void;
  claimDisabled?: boolean;
  messageDisabled?: boolean;
  ownerSection?: React.ReactNode;
  /** Owner lifecycle controls replace claim/message when set. */
  lifecycleActions?: React.ReactNode;
};

export function DetailActionCard({
  isAvailable,
  isUgc,
  onClaim,
  onMessage,
  claimDisabled,
  messageDisabled,
  ownerSection,
  lifecycleActions,
}: DetailActionCardProps) {
  const { messages } = useMessages();

  return (
    <div className="sticky top-28 rounded-xl border border-outline-variant bg-surface-container-lowest p-space-lg">
      <div className="mb-space-lg flex items-center justify-between">
        <div>
          <span className="mb-1 block text-label-sm uppercase tracking-widest text-secondary">
            {messages.detail.statusLabel}
          </span>
          {isAvailable ? (
            <span className="flex items-center gap-space-xs text-label-md font-bold text-green-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
              {messages.detail.statusAvailableNow}
            </span>
          ) : (
            <span className="flex items-center gap-space-xs text-label-md font-bold text-on-surface-variant">
              <span className="h-2 w-2 rounded-full bg-outline" />
              {messages.listing.reserved}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="mb-1 block text-label-sm uppercase tracking-widest text-secondary">
            {messages.detail.costLabel}
          </span>
          <span className="text-h3 font-semibold text-primary">{messages.detail.costFree}</span>
        </div>
      </div>

      {lifecycleActions ?? (
        <>
          {isAvailable ? (
            <Button
              type="button"
              className="flex w-full items-center justify-center gap-space-sm py-space-md"
              disabled={claimDisabled}
              onClick={onClaim}
            >
              <span className="material-symbols-outlined text-sm">bolt</span>
              {messages.detail.claimThisItem}
            </Button>
          ) : (
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-center gap-space-sm border border-primary bg-surface py-space-md text-label-md font-medium text-primary"
            >
              {messages.listing.claimed}
            </button>
          )}
          <Button
            type="button"
            variant="secondary"
            className="mt-space-sm flex w-full items-center justify-center gap-space-sm border border-outline py-space-md"
            disabled={messageDisabled || !isAvailable}
            onClick={onMessage}
          >
            <span className="material-symbols-outlined text-sm">chat_bubble</span>
            {messages.detail.messageOwner}
          </Button>
        </>
      )}

      <div className="mt-space-lg border-t border-outline-variant pt-space-md">
        {ownerSection ?? (
          <div className="flex items-center gap-space-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary-fixed">
              <span className="material-symbols-outlined text-on-surface-variant">person</span>
            </div>
            <div>
              <p className="text-label-md font-bold text-primary">
                {isUgc ? messages.detail.ownerCommunity : messages.detail.ownerSubito}
              </p>
              <p className="text-label-sm text-secondary">{messages.detail.ownerMeta}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
