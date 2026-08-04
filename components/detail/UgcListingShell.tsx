'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DetailActionCard } from '@/components/detail/DetailActionCard';
import { DetailArticle } from '@/components/detail/DetailArticle';
import { DetailFooter } from '@/components/detail/DetailFooter';
import { DetailLocationBlock } from '@/components/detail/DetailLocationBlock';
import { DetailSourceIdentity } from '@/components/detail/DetailSourceIdentity';
import { DetailTopBar } from '@/components/detail/DetailTopBar';
import { HeroMetadata } from '@/components/detail/HeroMetadata';
import { SimilarListings } from '@/components/detail/SimilarListings';
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
import { createClient } from '@/lib/supabase/client';
import type { ListingRow, OwnerListingRow } from '@/lib/listings/types';
import { messages } from '@/messages/it';

type UgcListingShellProps = {
  listing: (ListingRow | OwnerListingRow) & {
    description?: string | null;
    hidden_reason?: string | null;
    owner_user_id?: string;
  };
  isOwnerView?: boolean;
  similarListings: ListingRow[];
};

export function UgcListingShell({
  listing,
  isOwnerView = false,
  similarListings,
}: UgcListingShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [lifecyclePending, setLifecyclePending] = useState(false);
  const [deliverConfirmOpen, setDeliverConfirmOpen] = useState(false);

  const isReserved = listing.status === 'claimed';
  const isAvailable = listing.status === 'active';
  const isHiddenPending =
    listing.status === 'hidden' && listing.hidden_reason === 'pending_review';
  const isOwner =
    isOwnerView &&
    Boolean(listing.owner_user_id) &&
    listing.owner_user_id === sessionUserId;
  const showHiddenBanner = isOwner && isHiddenPending;
  const showOwnerLifecycle = isOwner && !isHiddenPending && listing.status !== 'expired';
  const authRedirect = `/listing/${listing.id}?openDm=1`;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(Boolean(user));
      setSessionUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (searchParams.get('openDm') === '1' && isLoggedIn) {
      setDmOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('openDm');
      const qs = params.toString();
      router.replace(`/listing/${listing.id}${qs ? `?${qs}` : ''}`, { scroll: false });
    }
  }, [searchParams, isLoggedIn, listing.id, router]);

  const handleConversationReady = useCallback((id: string, nextReadOnly: boolean) => {
    setConversationId(id || null);
    setReadOnly(nextReadOnly);
  }, []);

  const openContact = () => {
    if (isReserved) return;
    if (!isLoggedIn) {
      setAuthOpen(true);
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

  const lifecycleActions = showOwnerLifecycle ? (
    <div className="flex flex-col gap-space-sm">
      {!isReserved && (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={lifecyclePending}
          onClick={() => patchStatus('reserved')}
        >
          {messages.detail.markReserved}
        </Button>
      )}
      <Button
        type="button"
        className="w-full"
        disabled={lifecyclePending}
        onClick={() => setDeliverConfirmOpen(true)}
      >
        {messages.detail.markDelivered}
      </Button>
      <Link
        href="/post/manage"
        className="text-center text-label-sm text-on-surface-variant underline-offset-2 hover:underline"
      >
        {messages.post.manageLink}
      </Link>
    </div>
  ) : undefined;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface">
      <DetailTopBar listing={listing} />

      <main className="mx-auto w-full max-w-container-max px-gutter py-space-xl pb-32">
        <div className="grid grid-cols-1 gap-space-xl lg:grid-cols-12">
          <div className="flex flex-col gap-space-lg lg:col-span-8">
            {showHiddenBanner && <HiddenReviewBanner />}
            <HeroMetadata listing={listing} />
            <DetailArticle description={listing.description} isUgc />
          </div>

          <aside className="flex flex-col gap-space-lg lg:col-span-4">
            <DetailActionCard
              isAvailable={isAvailable}
              isUgc
              onClaim={openContact}
              onMessage={openContact}
              messageDisabled={isReserved}
              claimDisabled={isReserved}
              lifecycleActions={lifecycleActions}
            />
            <DetailSourceIdentity listing={listing} />
            <DetailLocationBlock listing={listing} />
            <SimilarListings listings={similarListings} />
          </aside>
        </div>
        <DetailFooter />
      </main>

      <AuthPromptModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        redirectTo={authRedirect}
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
    </div>
  );
}
