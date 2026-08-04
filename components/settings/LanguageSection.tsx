'use client';

import { SettingsCard, SettingsSectionTitle } from '@/components/settings/SettingsUi';
import {
  readAppPreferences,
  subscribeAppPreferences,
} from '@/lib/settings/preferences';
import { setAppLanguage } from '@/lib/user/locale-client';
import { LANGUAGES } from '@/lib/i18n/languages';
import { useMessages } from '@/lib/i18n/useMessages';
import { cn } from '@/lib/utils';
import { useSyncExternalStore } from 'react';

export function LanguageSection() {
  const { messages } = useMessages();
  const preferences = useSyncExternalStore(
    subscribeAppPreferences,
    readAppPreferences,
    () => readAppPreferences(),
  );

  return (
    <section className="mb-space-xl">
      <SettingsSectionTitle>{messages.settings.languageSection}</SettingsSectionTitle>
      <SettingsCard className="p-space-xs">
        <div className="flex rounded-lg bg-surface-container-low p-space-xs">
          {LANGUAGES.map((language) => {
            const active = preferences.language === language.id;
            return (
              <button
                key={language.id}
                type="button"
                onClick={() => setAppLanguage(language.id)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-space-xs rounded-md px-space-sm py-space-sm transition-colors',
                  active
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface hover:bg-surface-container-high',
                )}
              >
                <span className="text-label-md font-bold">{language.label}</span>
                <span
                  className={cn(
                    'text-[10px] font-medium uppercase',
                    active ? 'opacity-80' : 'text-secondary',
                  )}
                >
                  {language.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsCard>
    </section>
  );
}
