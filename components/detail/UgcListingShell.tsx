'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DetailHeroControls } from '@/components/detail/DetailHeroControls';
import { DetailPreviewWall } from '@/components/detail/DetailPreviewWall';
import { ListingDetailSkeleton } from '@/components/detail/ListingDetailSkeleton';
import { UgcListingDetailContent } from '@/components/detail/UgcListingDetailContent';
import { OwnerMessagesButton } from '@/components/messages/OwnerMessagesButton';
import { DmDrawer } from '@/components/messages/DmDrawer';
import { HiddenReviewBanner } from '@/components/ugc/HiddenReviewBanner';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';
import { buildAuthRedirectPath } from '@/lib/auth/build-auth-redirect';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import type { ListingRow, OwnerListingRow } from '@/lib/listings/types';
import { useMessages } from '@/lib/i18n/useMessages';

type UgcListingShellProps = {
  listing: (ListingRow | OwnerListingRow) & {
    description?: string | null;
    hidden_reason?: string | null;
    owner_user_id?: string;
  };
  isOwnerView?: boolean;
  similarListings: ListingRow[];
  searchParamsString?: string;
  openDm?: boolean;
};

export function UgcListingShell({
  listing,
  isOwnerView = false,
  similarListings,
  searchParamsString = '',
  openDm = false,
}: UgcListingShellProps) {
  const { messages } = useMessages();
  const { user, loading } = useAuthSession();
  const router = useRouter();
  const sessionUserId = user?.id ?? null;
  const isLoggedIn = Boolean(user);
  const [contactAuthOpen, setContactAuthOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [lifecyclePending, setLifecyclePending] = useState(false);
  const [deliverConfirmOpen, setDeliverConfirmOpen] = useState(false);

  const isReserved = listing.status === 'claimed';
  const isAvailable = listing.status === 'active';
  const isHiddenPending =
    listing.status === 'hidden' && listing.hidden_reason === 'pending_review';
  const authReady = !loading;
  const isOwner =
    isOwnerView &&
    Boolean(listing.owner_user_id) &&
    (!authReady || listing.owner_user_id === sessionUserId);
  const showHiddenBanner = isOwner && isHiddenPending;
  const showOwnerLifecycle = isOwner && !isHiddenPending && listing.status !== 'expired';
  const previewRedirectTo = buildAuthRedirectPath(
    `/listing/${listing.id}`,
    searchParamsString,
  );
  const contactAuthRedirect = `/listing/${listing.id}?openDm=1`;

  useEffect(() => {
    if (!openDm || !isLoggedIn) return;

    setDmOpen(true);
    const params = new URLSearchParams(searchParamsString);
    params.delete('openDm');
    const qs = params.toString();
    router.replace(`/listing/${listing.id}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [openDm, isLoggedIn, listing.id, router, searchParamsString]);

  const handleConversationReady = useCallback((id: string, nextReadOnly: boolean) => {
    setConversationId(id || null);
    setReadOnly(nextReadOnly);
  }, []);

  const openContact = () => {
    if (isReserved) return;
    if (!isLoggedIn) {
      setContactAuthOpen(true);
      return;
    }
    setConversationId(null);
    setReadOnly(false);
    setDmOpen(true);
  };

  const handleDmOpenChange = (open: boolean) => {
    setDmOpen(open);
    if (!open) {
      setConversationId(null);
      setReadOnly(false);
    }
  };

  const patchStatus = async (action: 'reserved' | 'delivered') => {
    setLifecyclePending(true);
    try {
      const response = await fetch(`/api/ugc/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        toast(messages.manage.actionError);
        return;
      }

      if (action === 'reserved') {
        toast(messages.detail.reservedToast);
      }

      setDeliverConfirmOpen(false);
      router.refresh();
    } finally {
      setLifecyclePending(false);
    }
  };

  const ownerFooter = showOwnerLifecycle ? (
    <div className="flex flex-col gap-space-sm">
      {!isReserved && (
        <Button
          type="button"
          variant="secondary"
          className="w-full min-h-11"
          disabled={lifecyclePending}
          onClick={() => patchStatus('reserved')}
        >
          {messages.detail.markReserved}
        </Button>
      )}
      <Button
        type="button"
        className="w-full min-h-11"
        disabled={lifecyclePending}
        onClick={() => setDeliverConfirmOpen(true)}
      >
        {messages.detail.markDelivered}
      </Button>
      <Link
        href="/post/manage"
        className="py-space-xs text-center text-label-sm text-on-surface-variant underline-offset-2 hover:underline"
      >
        {messages.post.manageLink}
      </Link>
    </div>
  ) : undefined;

  if (!isOwnerView && loading) {
    return <ListingDetailSkeleton />;
  }

  if (!isOwnerView && !user) {
    return <DetailPreviewWall listing={listing} redirectTo={previewRedirectTo} />;
  }

  return (
    <>
      <UgcListingDetailContent
        listing={listing}
        similarListings={similarListings}
        isAvailable={isAvailable}
        isOwner={isOwner}
        onContact={openContact}
        contactDisabled={isReserved}
        ownerMessagesAction={isOwner ? <OwnerMessagesButton listingId={listing.id} /> : undefined}
        ownerFooter={ownerFooter}
        banner={showHiddenBanner ? <HiddenReviewBanner /> : undefined}
        heroControls={
          <DetailHeroControls
            listing={listing}
            showFavorite={!isOwner}
            showOverflow={!isOwner}
          />
        }
      />

      <AuthPromptModal
        open={contactAuthOpen}
        onOpenChange={setContactAuthOpen}
        redirectTo={contactAuthRedirect}
        modalTitle={messages.auth.detailTitle}
      />

      <DmDrawer
        open={dmOpen}
        onOpenChange={handleDmOpenChange}
        listing={{
          id: listing.id,
          title: listing.title,
          photo_url: listing.photo_url,
        }}
        conversationId={conversationId}
        readOnly={readOnly}
        onConversationReady={handleConversationReady}
      />

      <Dialog open={deliverConfirmOpen} onOpenChange={setDeliverConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{messages.detail.deliveredConfirmTitle}</DialogTitle>
            <DialogDescription>{messages.detail.deliveredConfirmBody}</DialogDescription>
          </DialogHeader>
          <div className="mt-space-md flex flex-col gap-space-sm sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setDeliverConfirmOpen(false)}
            >
              {messages.detail.cancel}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={lifecyclePending}
              onClick={() => patchStatus('delivered')}
            >
              {messages.detail.deliveredConfirmAction}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
