'use client';

import { useState } from 'react';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { SettingsAccountCard } from '@/components/settings/SettingsUi';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { createClient } from '@/lib/supabase/client';
import { useMessages } from '@/lib/i18n/useMessages';

function emailInitials(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return (local.slice(0, 2) || '?').toUpperCase();
}

export function AccountHeaderSection() {
  const { messages } = useMessages();
  const { email, loading } = useAuthSession();
  const [authOpen, setAuthOpen] = useState(false);

  if (loading) {
    return (
      <SettingsAccountCard>
        <p className="text-body-md text-on-surface-variant">{messages.settings.profileLoading}</p>
      </SettingsAccountCard>
    );
  }

  if (!email) {
    return (
      <>
        <SettingsAccountCard>
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface"
            aria-hidden
          >
            <span className="material-symbols-outlined text-label-md text-on-surface-variant">person</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body-md font-medium text-on-surface">{messages.settings.profilePlaceholder}</p>
            <p className="text-label-sm text-secondary">{messages.settings.profileStub}</p>
          </div>
          <Button type="button" size="sm" className="shrink-0" onClick={() => setAuthOpen(true)}>
            {messages.settings.signIn}
          </Button>
        </SettingsAccountCard>

        <AuthPromptModal
          open={authOpen}
          onOpenChange={setAuthOpen}
          redirectTo="/settings"
          modalTitle={messages.auth.modalTitle}
        />
      </>
    );
  }

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <SettingsAccountCard>
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container text-sm font-bold text-on-surface"
        aria-hidden
      >
        {emailInitials(email)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-md font-medium text-on-surface">{email}</p>
        <p className="text-label-sm text-secondary">{messages.settings.profileSignedIn}</p>
      </div>
      <Button type="button" size="sm" className="shrink-0" onClick={() => void handleSignOut()}>
        {messages.settings.signOut}
      </Button>
    </SettingsAccountCard>
  );
}
