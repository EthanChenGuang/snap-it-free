'use client';

import { SettingsGroupCard, SettingsSectionTitle } from '@/components/settings/SettingsUi';
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
    <section className="mb-6">
      <SettingsSectionTitle>{messages.settings.languageSection}</SettingsSectionTitle>
      <SettingsGroupCard className="p-2">
        <div className="flex rounded-xl bg-neutral-100 p-1">
          {LANGUAGES.map((language) => {
            const active = preferences.language === language.id;
            return (
              <button
                key={language.id}
                type="button"
                onClick={() => setAppLanguage(language.id)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2.5 transition-colors',
                  active
                    ? 'bg-white text-on-surface shadow-sm'
                    : 'text-on-surface hover:bg-white/50',
                )}
              >
                <span className="text-label-md font-bold">{language.label}</span>
                <span
                  className={cn(
                    'text-[10px] font-medium uppercase',
                    active ? 'text-secondary' : 'text-neutral-400',
                  )}
                >
                  {language.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsGroupCard>
    </section>
  );
}
