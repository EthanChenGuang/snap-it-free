'use client';

import {
  DEFAULT_PREFERENCES,
  readAppPreferences,
  subscribeAppPreferences,
} from '@/lib/settings/preferences';
import { forcedThemeFromAppearance } from '@/lib/settings/resolve-appearance';
import { ThemeProvider } from 'next-themes';
import { useSyncExternalStore } from 'react';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const preferences = useSyncExternalStore(
    subscribeAppPreferences,
    readAppPreferences,
    () => DEFAULT_PREFERENCES,
  );

  const forcedTheme = forcedThemeFromAppearance(preferences.appearance);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      forcedTheme={forcedTheme}
      disableTransitionOnChange
      storageKey="shoumanwu-next-themes"
    >
      {children}
    </ThemeProvider>
  );
}
