'use client';

import { SettingsCard, SettingsSectionTitle } from '@/components/settings/SettingsUi';
import {
  readAppPreferences,
  subscribeAppPreferences,
  writeAppPreferences,
  type AppLanguage,
} from '@/lib/settings/preferences';
import { messages } from '@/messages/it';
import { cn } from '@/lib/utils';
import { useSyncExternalStore } from 'react';

const LANGUAGES: { id: AppLanguage; label: string; sublabel: string }[] = [
  { id: 'zh', label: '中文', sublabel: 'Chinese' },
  { id: 'en', label: 'English', sublabel: 'English' },
  { id: 'it', label: 'Italiano', sublabel: 'Italian' },
];

export function LanguageSection() {
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
                onClick={() => writeAppPreferences({ language: language.id })}
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
      {preferences.language !== 'it' && (
        <p className="mt-space-sm text-label-sm text-secondary">{messages.settings.languageNote}</p>
      )}
    </section>
  );
}
