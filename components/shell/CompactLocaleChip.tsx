'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LANGUAGES } from '@/lib/i18n/languages';
import { useMessages } from '@/lib/i18n/useMessages';
import { setAppLanguage } from '@/lib/user/locale-client';
import type { AppLanguage } from '@/lib/settings/preferences';
import { cn } from '@/lib/utils';

const COMPACT_LABELS: Record<AppLanguage, string> = {
  zh: '中',
  en: 'EN',
  it: 'IT',
};

/** Compact locale chip (中/EN/IT) opening full language picker (D-05). */
export function CompactLocaleChip() {
  const { language, messages } = useMessages();
  const compactLabel = COMPACT_LABELS[language];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 touch-manipulation cursor-pointer items-center justify-center rounded-full feed-glass-icon-btn text-label-sm font-semibold text-on-surface transition-all duration-300 active:scale-[0.96]"
          aria-label={messages.header.languageMenu}
          aria-haspopup="listbox"
        >
          {compactLabel}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-[200] min-w-[9rem] rounded-lg border border-outline-variant bg-surface p-space-xs shadow-none"
          sideOffset={4}
          align="start"
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
                onSelect={() => setAppLanguage(entry.id)}
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
