'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ListingPhoto } from '@/components/listings/ListingPhoto';
import { PaywallDialog } from '@/components/onboarding/PaywallDialog';
import { SymbolIcon } from '@/components/onboarding/SymbolIcon';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/lib/i18n/useMessages';
import type { LockedPreviewPhoto } from '@/lib/paywall/locked-preview';

function LockedCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const { messages } = useMessages();
  const copy = messages.locked;
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [checkoutReturned, setCheckoutReturned] = useState(false);

  // Back from Stripe but still locked: the webhook has not landed yet.
  useEffect(() => {
    const state = new URLSearchParams(window.location.search).get('checkout');
    setCheckoutReturned(state === 'success' || state === 'pending');
  }, []);

  return (
    <section
      className="rounded-lg border border-outline-variant bg-surface-container-lowest p-space-lg"
      data-testid="locked-card"
    >
      <SymbolIcon name="lock" className="text-[32px] text-on-surface" />
      <h1 className="mt-space-md text-h3 text-on-surface">{title}</h1>
      <p className="mt-space-sm text-body-md text-on-surface-variant">{body}</p>
      {checkoutReturned && (
        <p role="status" className="mt-space-md rounded-lg border border-outline-variant p-space-md text-body-md text-on-surface">
          {copy.checkoutPending}
        </p>
      )}
      <Button
        type="button"
        className="mt-space-lg h-12 w-full"
        onClick={() => setPaywallOpen(true)}
        data-testid="locked-see-plans"
      >
        {copy.seePlans}
      </Button>
      <p className="mt-space-md text-center text-label-sm text-on-surface-variant">
        {copy.signInHint}{' '}
        <Link href="/settings" className="text-on-surface underline underline-offset-2">
          {copy.signIn}
        </Link>
      </p>
      {children}
      {paywallOpen && <PaywallDialog onClose={() => setPaywallOpen(false)} />}
    </section>
  );
}

/** Home for a non-subscriber: real count and blurred real photos, never the listing payload. */
export function LockedFeed({ count, photos }: { count: number | null; photos: LockedPreviewPhoto[] }) {
  const { messages } = useMessages();
  const copy = messages.locked;

  return (
    <main className="feed-home relative flex h-full min-h-0 flex-col overflow-hidden" data-testid="locked-feed">
      <div
        className="pointer-events-none grid select-none grid-cols-2 gap-x-space-md gap-y-space-lg px-gutter pt-space-xs sm:grid-cols-3 lg:grid-cols-4"
        aria-hidden
      >
        {photos.map((photo) => (
          <div key={photo.id} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-container-high">
            <div className="absolute inset-0 scale-110 blur-[14px]">
              <ListingPhoto src={photo.photoUrl} alt="" variant="thumbnail" sizes="200px" priority />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-center bg-gradient-to-t from-background via-background/90 to-background/10 px-gutter pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        <div className="w-full max-w-[440px]">
          <LockedCard title={copy.title} body={copy.body(count ?? 0)} />
        </div>
      </div>
      <span className="sr-only">{copy.previewLabel}</span>
    </main>
  );
}

export function LockedPanel({ variant }: { variant: 'detail' | 'favorites' }) {
  const { messages } = useMessages();
  const copy = messages.locked;
  const title = variant === 'detail' ? copy.detailTitle : copy.favoritesTitle;
  const body = variant === 'detail' ? copy.detailBody : copy.favoritesBody;

  return (
    <main className="flex h-full min-h-0 items-center justify-center overflow-y-auto px-gutter py-space-xl" data-testid={`locked-${variant}`}>
      <div className="w-full max-w-[440px]">
        <LockedCard title={title} body={body}>
          <Link
            href="/"
            className="mt-space-sm block text-center text-label-md text-on-surface-variant underline-offset-2 hover:underline"
          >
            {copy.backHome}
          </Link>
        </LockedCard>
      </div>
    </main>
  );
}
