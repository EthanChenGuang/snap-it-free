'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DetailTopBar } from '@/components/detail/DetailTopBar';
import { HeroMetadata } from '@/components/detail/HeroMetadata';
import { isAllowedExternalUrl, openExternalListingUrl } from '@/lib/listings/external-url';
import type { ListingRow } from '@/lib/listings/types';
import { messages } from '@/messages/it';

const IFRAME_SANDBOX = 'allow-popups allow-popups-to-escape-sandbox';
const EMBED_TIMEOUT_MS = 5000;

type ScrapedListingShellProps = {
  listing: ListingRow;
};

export function ScrapedListingShell({ listing }: ScrapedListingShellProps) {
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const canOpenExternal = isAllowedExternalUrl(listing.external_url);

  useEffect(() => {
    if (!canOpenExternal) {
      setEmbedBlocked(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setEmbedBlocked(true);
    }, EMBED_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [canOpenExternal, listing.external_url]);

  const handleEmbedError = () => {
    setEmbedBlocked(true);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <DetailTopBar listing={listing} />

      <main className="mx-auto w-full max-w-container-max px-gutter py-space-lg pb-32">
        <div className="grid grid-cols-1 gap-space-xl lg:grid-cols-12">
          <div className="flex flex-col gap-space-lg lg:col-span-8">
            <HeroMetadata listing={listing} />

            {canOpenExternal && !embedBlocked && (
              <section className="overflow-hidden rounded border border-outline-variant bg-surface-container-low">
                <iframe
                  title={listing.title}
                  src={listing.external_url}
                  sandbox={IFRAME_SANDBOX}
                  className="h-[50vh] w-full border-0"
                  onError={handleEmbedError}
                />
              </section>
            )}

            {embedBlocked && (
              <section className="rounded border border-outline-variant bg-surface-container-low p-space-lg">
                <p className="text-body-md leading-relaxed text-on-surface-variant">
                  {messages.detail.embedBlocked}
                </p>
                {canOpenExternal && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-space-md"
                    onClick={() => openExternalListingUrl(listing.external_url)}
                  >
                    {messages.detail.openOnSubito}
                  </Button>
                )}
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
                  <span className="flex items-center gap-space-xs text-label-md font-bold text-accent-orange">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-orange" />
                    {messages.detail.statusAvailable}
                  </span>
                </div>
                <div className="text-right">
                  <span className="mb-space-xs block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    {messages.detail.costLabel}
                  </span>
                  <span className="rounded border border-accent-orange/30 bg-accent-orange/10 px-space-sm py-space-xs text-label-md font-bold text-accent-orange">
                    {messages.listing.free}
                  </span>
                </div>
              </div>

              {canOpenExternal ? (
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => openExternalListingUrl(listing.external_url)}
                >
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  {messages.detail.claimOnSubito}
                </Button>
              ) : (
                <p className="text-label-sm text-on-surface-variant">{messages.detail.externalLinkUnavailable}</p>
              )}

              <div className="mt-space-lg rounded border border-outline-variant bg-surface-container-low p-space-md">
                <div className="flex items-center gap-space-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-outline-variant bg-surface text-accent-orange">
                    <span className="material-symbols-outlined text-base">verified</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      {messages.detail.sourceLabel}
                    </p>
                    <p className="text-label-md font-semibold text-on-surface">
                      {messages.listing.sourceSubito}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
