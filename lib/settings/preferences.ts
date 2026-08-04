export type AppLanguage = 'zh' | 'en' | 'it';
export type AppearanceMode = 'light' | 'dark';

export type AppPreferences = {
  language: AppLanguage;
  appearance: AppearanceMode;
  soundAlerts: boolean;
};

export const APP_PREFERENCES_KEY = 'shoumanwu_app_preferences';
export const APP_PREFERENCES_CHANGE_EVENT = 'shoumanwu-app-preferences-change';

export const DEFAULT_PREFERENCES: AppPreferences = {
  language: 'zh',
  appearance: 'light',
  soundAlerts: false,
};

let cachedSnapshot: AppPreferences = DEFAULT_PREFERENCES;

function preferencesEqual(a: AppPreferences, b: AppPreferences): boolean {
  return (
    a.language === b.language &&
    a.appearance === b.appearance &&
    a.soundAlerts === b.soundAlerts
  );
}

function parsePreferences(raw: string | null): AppPreferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return {
      language:
        parsed.language === 'zh' || parsed.language === 'en' || parsed.language === 'it'
          ? parsed.language
          : DEFAULT_PREFERENCES.language,
      appearance: normalizeAppearance(parsed.appearance),
      soundAlerts: Boolean(parsed.soundAlerts),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function syncSnapshotFromStorage(): AppPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  const parsed = parsePreferences(localStorage.getItem(APP_PREFERENCES_KEY));
  if (preferencesEqual(parsed, cachedSnapshot)) {
    return cachedSnapshot;
  }

  cachedSnapshot = parsed;
  return cachedSnapshot;
}

export function readAppPreferences(): AppPreferences {
  return syncSnapshotFromStorage();
}

export function writeAppPreferences(partial: Partial<AppPreferences>): AppPreferences {
  const current = readAppPreferences();
  const next: AppPreferences = { ...current, ...partial };

  if (preferencesEqual(next, current)) {
    return current;
  }

  cachedSnapshot = next;
  if (typeof window !== 'undefined') {
    localStorage.setItem(APP_PREFERENCES_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(APP_PREFERENCES_CHANGE_EVENT, { detail: next }));
  }
  return next;
}

function normalizeAppearance(value: unknown): AppearanceMode {
  if (value === 'light' || value === 'dark') return value;
  if (value === 'system' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return DEFAULT_PREFERENCES.appearance;
}

export function cycleAppearance(current: AppearanceMode): AppearanceMode {
  return current === 'light' ? 'dark' : 'light';
}

export function resetLocalAppData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(APP_PREFERENCES_KEY);
  localStorage.removeItem('shoumanwu_favorites');
  localStorage.removeItem('shoumanwu_reported_listings');
  localStorage.removeItem('shoumanwu_ios_push_dismissed');
  cachedSnapshot = DEFAULT_PREFERENCES;
  window.dispatchEvent(new CustomEvent(APP_PREFERENCES_CHANGE_EVENT, { detail: DEFAULT_PREFERENCES }));
}

export function subscribeAppPreferences(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onStoreChange();
  window.addEventListener(APP_PREFERENCES_CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(APP_PREFERENCES_CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
