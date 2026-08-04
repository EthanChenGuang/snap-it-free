'use client';

import { useMessages } from '@/lib/i18n/useMessages';
import type { ListingRow } from '@/lib/listings/types';

type DetailSourceIdentityProps = {
  listing: ListingRow;
};

export function DetailSourceIdentity({ listing }: DetailSourceIdentityProps) {
  const { messages } = useMessages();

  const isUgc = listing.source === 'ugc';

  return (
    <div className="flex items-center gap-space-md rounded-xl border border-outline-variant bg-surface-container-low p-space-md">
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-space-sm">
        <span className="material-symbols-outlined text-primary">verified</span>
      </div>
      <div>
        <p className="text-label-sm uppercase tracking-tighter text-secondary">
          {messages.detail.sourceIdentityTitle}
        </p>
        <p className="text-label-md font-medium text-primary">
          {isUgc ? messages.detail.sourceIdentityCommunity : messages.detail.sourceIdentitySubito}
        </p>
      </div>
    </div>
  );
}
