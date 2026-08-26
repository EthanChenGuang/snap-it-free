'use client';

import { MessagesSettingsRow } from '@/components/settings/MessagesSettingsRow';
import {
  SettingsChevron,
  SettingsRowCard,
  SettingsSectionTitle,
} from '@/components/settings/SettingsUi';
import {
  cycleAppearance,
  DEFAULT_PREFERENCES,
  readAppPreferences,
  subscribeAppPreferences,
  writeAppPreferences,
  type AppearanceMode,
} from '@/lib/settings/preferences';
import { useMessages } from '@/lib/i18n/useMessages';
import { useSyncExternalStore } from 'react';

function appearanceLabel(
  mode: AppearanceMode,
  messages: ReturnType<typeof useMessages>['messages'],
): string {
  return mode === 'dark' ? messages.settings.appearanceDark : messages.settings.appearanceLight;
}

export function GeneralSection() {
  const { messages } = useMessages();

  const preferences = useSyncExternalStore(
    subscribeAppPreferences,
    readAppPreferences,
    () => DEFAULT_PREFERENCES,
  );

  const handleAppearanceClick = () => {
    writeAppPreferences({ appearance: cycleAppearance(preferences.appearance) });
  };

  return (
    <section className="mb-6">
      <SettingsSectionTitle>{messages.settings.generalSection}</SettingsSectionTitle>

      <SettingsRowCard onClick={handleAppearanceClick}>
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="material-symbols-outlined text-[22px] text-neutral-500">dark_mode</span>
          <span className="text-body-md text-on-surface">{messages.settings.appearance}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-label-sm text-neutral-500">
            {appearanceLabel(preferences.appearance, messages)}
          </span>
          <SettingsChevron />
        </div>
      </SettingsRowCard>

      <SettingsRowCard href="/post/manage">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="material-symbols-outlined text-[22px] text-neutral-500">inventory_2</span>
          <span className="text-body-md text-on-surface">{messages.post.manageLink}</span>
        </div>
        <SettingsChevron />
      </SettingsRowCard>

      <MessagesSettingsRow />
    </section>
  );
}
