'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SettingsChevron } from '@/components/settings/SettingsUi';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { useUnreadMessageCount } from '@/lib/messages/useUnreadMessageCount';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';

function badgeLabel(count: number): string {
  return count > 9 ? '9+' : String(count);
}

export function MessagesSettingsRow() {
  const { messages } = useMessages();
  const { user, loading } = useAuthSession();
  const { count } = useUnreadMessageCount();
  const [authOpen, setAuthOpen] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (loading || user) {
      return;
    }
    event.preventDefault();
    setAuthOpen(true);
  };

  return (
    <>
      <Link
        href="/messages"
        onClick={handleClick}
        className={cn(
          'mb-3 flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest p-4 transition-transform active:scale-[0.98]',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="material-symbols-outlined text-label-md text-on-surface-variant">chat_bubble</span>
          <span className="text-body-md text-on-surface">{messages.settings.myMessages}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {count > 0 && (
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-label-sm font-bold leading-none text-on-primary"
              aria-label={messages.settings.messages.badgeLabel(count)}
            >
              {badgeLabel(count)}
            </span>
          )}
          <SettingsChevron />
        </div>
      </Link>
      <AuthPromptModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        redirectTo="/messages"
        modalTitle={messages.auth.modalTitle}
      />
    </>
  );
}
