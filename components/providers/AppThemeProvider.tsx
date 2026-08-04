'use client';

import {
  readAppPreferences,
  subscribeAppPreferences,
  type AppearanceMode,
} from '@/lib/settings/preferences';
import { forcedThemeFromAppearance } from '@/lib/settings/resolve-appearance';
import { ThemeProvider } from 'next-themes';
import { useSyncExternalStore } from 'react';

const DEFAULT_APPEARANCE: AppearanceMode = 'system';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const preferences = useSyncExternalStore(
    subscribeAppPreferences,
    readAppPreferences,
    () => ({ language: 'it', appearance: DEFAULT_APPEARANCE, soundAlerts: false }),
  );

  const forcedTheme = forcedThemeFromAppearance(preferences.appearance);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      forcedTheme={forcedTheme}
      disableTransitionOnChange
      storageKey="shoumanwu-next-themes"
    >
      {children}
    </ThemeProvider>
  );
}
