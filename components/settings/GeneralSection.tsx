'use client';

import { useState } from 'react';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { Button } from '@/components/ui/button';
import {
  SettingsCard,
  SettingsSectionTitle,
} from '@/components/settings/SettingsUi';
import { useAuthSession } from '@/lib/auth/useAuthSession';
import {
  cycleAppearance,
  readAppPreferences,
  subscribeAppPreferences,
  writeAppPreferences,
  type AppearanceMode,
} from '@/lib/settings/preferences';
import { createClient } from '@/lib/supabase/client';
import { messages } from '@/messages/it';
import { useSyncExternalStore } from 'react';

function appearanceLabel(mode: AppearanceMode): string {
  if (mode === 'light') return messages.settings.appearanceLight;
  if (mode === 'dark') return messages.settings.appearanceDark;
  return messages.settings.appearanceSystem;
}

function emailInitials(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return (local.slice(0, 2) || '?').toUpperCase();
}

export function GeneralSection() {
  const { email, loading } = useAuthSession();
  const [authOpen, setAuthOpen] = useState(false);
  const preferences = useSyncExternalStore(
    subscribeAppPreferences,
    readAppPreferences,
    readAppPreferences,
  );

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  const handleAppearanceClick = () => {
    writeAppPreferences({ appearance: cycleAppearance(preferences.appearance) });
  };

  return (
    <>
      <section className="mb-space-xl">
        <SettingsSectionTitle>{messages.settings.generalSection}</SettingsSectionTitle>

        <SettingsCard className="p-space-md">
          {loading ? (
            <p className="text-body-md text-on-surface-variant">{messages.settings.profileLoading}</p>
          ) : email ? (
            <div className="flex items-center justify-between gap-space-md">
              <div className="flex min-w-0 items-center gap-space-md">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container text-label-md font-semibold text-on-surface"
                  aria-hidden
                >
                  {emailInitials(email)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-body-md font-medium text-on-surface">{email}</p>
                  <p className="text-label-sm text-secondary">{messages.settings.profileSignedIn}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={handleSignOut}
              >
                {messages.settings.signOut}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-space-md">
              <div className="flex min-w-0 items-center gap-space-md">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
                  aria-hidden
                >
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div className="min-w-0">
                  <p className="text-body-md font-medium text-on-surface">
                    {messages.settings.profilePlaceholder}
                  </p>
                  <p className="text-label-sm text-secondary">{messages.settings.profileStub}</p>
                </div>
              </div>
              <Button type="button" className="shrink-0" onClick={() => setAuthOpen(true)}>
                {messages.settings.signIn}
              </Button>
            </div>
          )}
        </SettingsCard>

        <SettingsCard className="mt-space-md">
          <button
            type="button"
            onClick={handleAppearanceClick}
            className="flex w-full items-center justify-between p-space-md text-left transition-colors hover:bg-surface-container-low"
          >
            <div className="flex items-center gap-space-md">
              <span className="material-symbols-outlined text-secondary">dark_mode</span>
              <span className="text-body-md text-on-surface">{messages.settings.appearance}</span>
            </div>
            <span className="text-label-sm text-secondary">
              {appearanceLabel(preferences.appearance)}
            </span>
          </button>
        </SettingsCard>
      </section>

      <AuthPromptModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        redirectTo="/settings"
        modalTitle={messages.auth.modalTitle}
      />
    </>
  );
}
