'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { HiddenReviewBanner } from '@/components/ugc/HiddenReviewBanner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';
import type { OwnerListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type ManageListingsClientProps = {
  listings: OwnerListingRow[];
  userId: string;
};

async function patchListingStatus(listingId: string, action: 'reserved' | 'delivered') {
  const response = await fetch(`/api/ugc/listings/${listingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return response;
}

export function ManageListingsClient({ listings, userId }: ManageListingsClientProps) {
  const { messages, formatRelativeTime } = useMessages();

  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deliverTarget, setDeliverTarget] = useState<OwnerListingRow | null>(null);

  const handleReserved = async (listing: OwnerListingRow) => {
    if (listing.owner_user_id !== userId) return;
    setPendingId(listing.id);
    try {
      const response = await patchListingStatus(listing.id, 'reserved');
      if (!response.ok) {
        toast(messages.manage.actionError);
        return;
      }
      toast(messages.manage.reservedToast);
      router.refresh();
    } finally {
      setPendingId(null);
    }
  };

  const handleDelivered = async () => {
    if (!deliverTarget || deliverTarget.owner_user_id !== userId) return;
    setPendingId(deliverTarget.id);
    try {
      const response = await patchListingStatus(deliverTarget.id, 'delivered');
      if (!response.ok) {
        toast(messages.manage.actionError);
        return;
      }
      setDeliverTarget(null);
      router.refresh();
    } finally {
      setPendingId(null);
    }
  };

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-space-md py-space-xl text-center">
        <h2 className="text-h3 font-semibold text-on-surface">{messages.manage.emptyTitle}</h2>
        <Button asChild>
          <Link href="/post">{messages.manage.emptyCta}</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col divide-y divide-outline-variant border-y border-outline-variant">
        {listings.map((listing) => {
          const isHidden =
            listing.status === 'hidden' && listing.hidden_reason === 'pending_review';
          const isReserved = listing.status === 'claimed';
          const isExpired = listing.status === 'expired';
          const isPending = pendingId === listing.id;

          return (
            <li key={listing.id} className="flex flex-col gap-space-md py-space-lg">
              {isHidden && <HiddenReviewBanner />}

              <div className="flex items-start justify-between gap-space-md">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/listing/${listing.id}`}
                    className="text-label-md font-semibold text-on-surface hover:underline"
                  >
                    {listing.title}
                  </Link>
                  <p className="mt-space-xs text-label-sm text-on-surface-variant">
                    {formatRelativeTime(listing.posted_at)}
                  </p>
                  {isReserved && (
                    <span className="mt-space-sm inline-flex rounded border border-outline-variant bg-surface-container-highest px-space-sm py-space-xs text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      {messages.listing.reserved}
                    </span>
                  )}
                </div>
                <Link
                  href={`/listing/${listing.id}`}
                  className="shrink-0 text-label-sm text-on-surface-variant hover:underline"
                >
                  {messages.manage.viewDetail}
                </Link>
              </div>

              {!isHidden && !isExpired && listing.owner_user_id === userId && (
                <div className="flex flex-col gap-space-sm sm:flex-row">
                  {!isReserved && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      disabled={isPending}
                      onClick={() => handleReserved(listing)}
                    >
                      {messages.manage.markReserved}
                    </Button>
                  )}
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={isPending}
                    onClick={() => setDeliverTarget(listing)}
                  >
                    {messages.manage.markDelivered}
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog open={Boolean(deliverTarget)} onOpenChange={(open) => !open && setDeliverTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{messages.manage.deliveredConfirmTitle}</DialogTitle>
            <DialogDescription>{messages.manage.deliveredConfirmBody}</DialogDescription>
          </DialogHeader>
          <div className="mt-space-md flex flex-col gap-space-sm sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setDeliverTarget(null)}
            >
              {messages.manage.cancel}
            </Button>
            <Button type="button" className="flex-1" disabled={Boolean(pendingId)} onClick={handleDelivered}>
              {messages.manage.deliveredConfirmAction}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
