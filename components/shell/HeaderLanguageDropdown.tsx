'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LANGUAGES } from '@/lib/i18n/languages';
import { useMessages } from '@/lib/i18n/useMessages';
import { writeAppPreferences } from '@/lib/settings/preferences';
import { cn } from '@/lib/utils';

export function HeaderLanguageDropdown() {
  const { language, messages } = useMessages();
  const current = LANGUAGES.find((entry) => entry.id === language) ?? LANGUAGES[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex min-h-11 min-w-11 touch-manipulation cursor-pointer items-center justify-center gap-space-xs px-space-sm text-label-md font-medium text-on-surface transition-opacity active:opacity-80"
          aria-label={messages.header.language}
          aria-haspopup="listbox"
        >
          <span>{current.label}</span>
          <span className="material-symbols-outlined text-[20px] text-secondary">expand_more</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-[200] min-w-[9rem] rounded-lg border border-outline-variant bg-surface p-space-xs shadow-none"
          sideOffset={4}
          align="end"
          aria-label={messages.header.languageMenu}
        >
          {LANGUAGES.map((entry) => {
            const active = entry.id === language;
            return (
              <DropdownMenu.Item
                key={entry.id}
                className={cn(
                  'flex min-h-11 cursor-pointer select-none items-center rounded-md px-space-md text-label-md text-on-surface outline-none',
                  'data-[highlighted]:bg-surface-container-low',
                  active && 'bg-surface-container-high',
                )}
                onSelect={() => writeAppPreferences({ language: entry.id })}
              >
                {entry.label}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
