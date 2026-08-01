'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DetailTopBar } from '@/components/detail/DetailTopBar';
import { HeroMetadata } from '@/components/detail/HeroMetadata';
import { DmDrawer } from '@/components/messages/DmDrawer';
import { HiddenReviewBanner } from '@/components/ugc/HiddenReviewBanner';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { ListingRow } from '@/lib/listings/types';
import { messages } from '@/messages/it';

type UgcListingShellProps = {
  listing: ListingRow & { description?: string | null; hidden_reason?: string | null };
  isOwnerView?: boolean;
};

export function UgcListingShell({ listing, isOwnerView = false }: UgcListingShellProps) {
  const searchParams = useSearchParams();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  const isReserved = listing.status === 'claimed';
  const showHiddenBanner =
    isOwnerView &&
    listing.status === 'hidden' &&
    listing.hidden_reason === 'pending_review';
  const authRedirect = `/listing/${listing.id}?openDm=1`;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(Boolean(user));
    });
  }, []);

  useEffect(() => {
    if (searchParams.get('openDm') === '1' && isLoggedIn) {
      setDmOpen(true);
    }
  }, [searchParams, isLoggedIn]);

  const handleConversationReady = useCallback((id: string, nextReadOnly: boolean) => {
    setConversationId(id || null);
    setReadOnly(nextReadOnly);
  }, []);

  const handleContatta = () => {
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

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <DetailTopBar listing={listing} />

      <main className="mx-auto w-full max-w-container-max px-gutter py-space-lg pb-32">
        <div className="grid grid-cols-1 gap-space-xl lg:grid-cols-12">
          <div className="flex flex-col gap-space-lg lg:col-span-8">
            {showHiddenBanner && <HiddenReviewBanner />}
            <HeroMetadata listing={listing} />

            {listing.description && (
              <section className="border-b border-outline-variant pb-space-lg">
                <h2 className="mb-space-sm text-h3 font-semibold text-on-surface">
                  {messages.detail.descriptionLabel}
                </h2>
                <p className="text-body-md leading-relaxed text-on-surface-variant">
                  {listing.description}
                </p>
              </section>
            )}
          </div>

          <aside className="flex flex-col gap-space-lg lg:col-span-4">
            <div className="sticky top-20 rounded border border-outline-variant bg-surface p-space-lg">
              <div className="mb-space-lg flex items-center justify-between border-b border-outline-variant pb-space-md">
                <div>
                  <span className="mb-space-xs block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    {messages.detail.statusLabel}
                  </span>
                  <span className="flex items-center gap-space-xs text-label-md font-bold text-on-surface">
                    {isReserved ? messages.listing.reserved : messages.detail.statusAvailable}
                  </span>
                </div>
                <div className="text-right">
                  <span className="mb-space-xs block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    {messages.detail.costLabel}
                  </span>
                  <span className="rounded border border-outline-variant bg-surface-container-low px-space-sm py-space-xs text-label-md font-bold text-on-surface">
                    {messages.listing.free}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={isReserved}
                onClick={handleContatta}
              >
                <span className="material-symbols-outlined text-sm">chat_bubble</span>
                {messages.detail.contact}
              </Button>

              {isReserved && (
                <p className="mt-space-sm text-center text-label-sm text-on-surface-variant">
                  {messages.detail.contactReserved}
                </p>
              )}

              <div className="mt-space-lg rounded border border-outline-variant bg-surface-container-low p-space-md">
                <div className="flex items-center gap-space-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-outline-variant bg-surface text-on-surface-variant">
                    <span className="material-symbols-outlined text-base">groups</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      {messages.detail.sourceLabel}
                    </p>
                    <p className="text-label-md font-semibold text-on-surface">
                      {messages.listing.sourceCommunity}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
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
    </div>
  );
}
