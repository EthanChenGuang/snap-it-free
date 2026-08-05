'use client';

import { useUnreadMatchCount } from '@/lib/alerts/useUnreadMatchCount';
import { useMessages } from '@/lib/i18n/useMessages';

function badgeLabel(count: number): string {
  return count > 9 ? '9+' : String(count);
}

/** Kept in its own chunk so the Supabase SDK stays out of the root layout. */
export function UnreadMatchBadge() {
  const { count } = useUnreadMatchCount();
  const { messages } = useMessages();

  if (count <= 0) return null;

  return (
    <span
      className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-[3px] text-[9px] font-bold leading-none text-on-primary"
      aria-label={messages.settings.matches.badgeLabel(count)}
    >
      {badgeLabel(count)}
    </span>
  );
}
