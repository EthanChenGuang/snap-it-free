'use client';

import { useState } from 'react';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import { createClient } from '@/lib/supabase/client';
import { useMessages } from '@/lib/i18n/useMessages';

export function ProfileSection() {
  const { messages } = useMessages();

  const { email, loading } = useAuthSession();
  const [authOpen, setAuthOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return (
    <>
      <section className="mb-space-xl">
        <h2 className="mb-space-md ml-space-xs text-label-md uppercase tracking-wider text-on-secondary-container">
          {messages.settings.generalSection}
        </h2>
        <div className="overflow-hidden rounded border border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center justify-between border-b border-outline-variant p-space-md">
            <div className="flex items-center gap-space-md">
              <span className="material-symbols-outlined text-secondary">person</span>
              <div>
                <p className="text-body-md font-medium text-on-surface">
                  {messages.settings.profileTitle}
                </p>
                <p className="text-label-sm text-secondary">
                  {loading
                    ? messages.settings.profileLoading
                    : email
                      ? messages.settings.profileSignedIn
                      : messages.settings.profilePlaceholder}
                </p>
              </div>
            </div>
          </div>
          <div className="p-space-md">
            {loading ? (
              <p className="text-body-md text-on-surface-variant">{messages.settings.profileLoading}</p>
            ) : email ? (
              <div className="flex flex-col gap-space-md sm:flex-row sm:items-center sm:justify-between">
                <p className="text-body-md text-on-surface">{email}</p>
                <Button type="button" variant="secondary" onClick={handleSignOut}>
                  {messages.settings.signOut}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-space-sm">
                <p className="text-body-md text-on-surface-variant">{messages.settings.profileStub}</p>
                <Button type="button" className="w-fit" onClick={() => setAuthOpen(true)}>
                  {messages.settings.signIn}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <AuthPromptModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        redirectTo="/settings?tab=alerts"
        modalTitle={messages.auth.alertTitle}
      />
    </>
  );
}
