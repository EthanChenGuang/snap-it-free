'use client';

import { useUnreadMatchCount } from '@/lib/alerts/useUnreadMatchCount';
import { useUnreadMessageCount } from '@/lib/messages/useUnreadMessageCount';
import { useMessages } from '@/lib/i18n/useMessages';

function badgeLabel(count: number): string {
  return count > 9 ? '9+' : String(count);
}

/** Combined settings-tab badge for unread messages and alert matches. */
export function SettingsNavBadge() {
  const { count: matchCount } = useUnreadMatchCount();
  const { count: messageCount } = useUnreadMessageCount();
  const { messages } = useMessages();

  const total = matchCount + messageCount;
  if (total <= 0) return null;

  return (
    <span
      className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-[3px] text-[9px] font-bold leading-none text-on-primary"
      aria-label={messages.settings.navBadgeLabel(total)}
    >
      {badgeLabel(total)}
    </span>
  );
}

/** @deprecated Use SettingsNavBadge — kept for dynamic import path stability. */
export const UnreadMatchBadge = SettingsNavBadge;
