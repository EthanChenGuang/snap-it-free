'use client';

import { useMessages } from '@/lib/i18n/useMessages';

export function ReservedBadge() {
  const { messages } = useMessages();

  return (
    <span className="rounded-sm bg-surface-container-high px-space-sm py-space-xs text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
      {messages.listing.reserved}
    </span>
  );
}
