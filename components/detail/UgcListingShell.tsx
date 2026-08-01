'use client';

import { DetailTopBar } from '@/components/detail/DetailTopBar';
import { HeroMetadata } from '@/components/detail/HeroMetadata';
import { Button } from '@/components/ui/button';
import type { ListingRow } from '@/lib/listings/types';
import { messages } from '@/messages/it';

type UgcListingShellProps = {
  listing: ListingRow & { description?: string | null };
};

export function UgcListingShell({ listing }: UgcListingShellProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <DetailTopBar listing={listing} />

      <main className="mx-auto w-full max-w-container-max px-gutter py-space-lg pb-32">
        <div className="grid grid-cols-1 gap-space-xl lg:grid-cols-12">
          <div className="flex flex-col gap-space-lg lg:col-span-8">
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
                    {listing.status === 'claimed'
                      ? messages.listing.reserved
                      : messages.detail.statusAvailable}
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

              <Button type="button" className="w-full" disabled>
                <span className="material-symbols-outlined text-sm">chat_bubble</span>
                {messages.detail.contactStub}
              </Button>

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
    </div>
  );
}
