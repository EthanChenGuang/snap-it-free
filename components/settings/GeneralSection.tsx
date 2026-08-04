'use client';

import { useState } from 'react';
import { AuthPromptModal } from '@/components/ugc/AuthPromptModal';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
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

export function GeneralSection() {
  const { email, loading } = useAuthSession();
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const preferences = useSyncExternalStore(
    subscribeAppPreferences,
    readAppPreferences,
    () => readAppPreferences(),
  );

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfileOpen(false);
  };

  const handleAppearanceClick = () => {
    writeAppPreferences({ appearance: cycleAppearance(preferences.appearance) });
  };

  return (
    <>
      <section className="mb-space-xl">
        <SettingsSectionTitle>{messages.settings.generalSection}</SettingsSectionTitle>
        <SettingsCard>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex w-full items-center justify-between border-b border-outline-variant p-space-md text-left transition-colors hover:bg-surface-container-low"
          >
            <div className="flex items-center gap-space-md">
              <span className="material-symbols-outlined text-secondary">person</span>
              <span className="text-body-md text-on-surface">{messages.settings.profileInformation}</span>
            </div>
            <span className="material-symbols-outlined text-outline">chevron_right</span>
          </button>

          <button
            type="button"
            onClick={handleAppearanceClick}
            className="flex w-full items-center justify-between border-b border-outline-variant p-space-md text-left transition-colors hover:bg-surface-container-low"
          >
            <div className="flex items-center gap-space-md">
              <span className="material-symbols-outlined text-secondary">dark_mode</span>
              <span className="text-body-md text-on-surface">{messages.settings.appearance}</span>
            </div>
            <span className="text-label-sm text-secondary">
              {appearanceLabel(preferences.appearance)}
            </span>
          </button>

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
        </SettingsCard>
      </section>

      <Drawer open={profileOpen} onOpenChange={setProfileOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{messages.settings.profileInformation}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-space-md px-gutter pb-space-lg">
            {loading ? (
              <p className="text-body-md text-on-surface-variant">{messages.settings.profileLoading}</p>
            ) : email ? (
              <>
                <p className="text-body-md text-on-surface">{email}</p>
                <p className="text-label-sm text-secondary">{messages.settings.profileSignedIn}</p>
                <Button type="button" variant="secondary" className="w-fit" onClick={handleSignOut}>
                  {messages.settings.signOut}
                </Button>
              </>
            ) : (
              <>
                <p className="text-body-md text-on-surface-variant">{messages.settings.profilePlaceholder}</p>
                <Button type="button" onClick={() => setAuthOpen(true)}>
                  {messages.settings.signIn}
                </Button>
              </>
            )}
            <DrawerClose asChild>
              <Button type="button" variant="ghost" className="w-fit">
                {messages.settings.close}
              </Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>

      <AuthPromptModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        redirectTo="/settings"
        modalTitle={messages.auth.modalTitle}
      />
    </>
  );
}
