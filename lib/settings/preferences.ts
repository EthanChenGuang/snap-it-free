export type AppLanguage = 'zh' | 'en' | 'it';
export type AppearanceMode = 'system' | 'light' | 'dark';

export type AppPreferences = {
  language: AppLanguage;
  appearance: AppearanceMode;
  soundAlerts: boolean;
};

export const APP_PREFERENCES_KEY = 'shoumanwu_app_preferences';
export const APP_PREFERENCES_CHANGE_EVENT = 'shoumanwu-app-preferences-change';

const DEFAULT_PREFERENCES: AppPreferences = {
  language: 'it',
  appearance: 'system',
  soundAlerts: false,
};

function parsePreferences(raw: string | null): AppPreferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return {
      language:
        parsed.language === 'zh' || parsed.language === 'en' || parsed.language === 'it'
          ? parsed.language
          : DEFAULT_PREFERENCES.language,
      appearance:
        parsed.appearance === 'system' ||
        parsed.appearance === 'light' ||
        parsed.appearance === 'dark'
          ? parsed.appearance
          : DEFAULT_PREFERENCES.appearance,
      soundAlerts: Boolean(parsed.soundAlerts),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function readAppPreferences(): AppPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  return parsePreferences(localStorage.getItem(APP_PREFERENCES_KEY));
}

export function writeAppPreferences(partial: Partial<AppPreferences>): AppPreferences {
  const next = { ...readAppPreferences(), ...partial };
  if (typeof window !== 'undefined') {
    localStorage.setItem(APP_PREFERENCES_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(APP_PREFERENCES_CHANGE_EVENT, { detail: next }));
  }
  return next;
}

export function cycleAppearance(current: AppearanceMode): AppearanceMode {
  if (current === 'system') return 'light';
  if (current === 'light') return 'dark';
  return 'system';
}

export function resetLocalAppData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(APP_PREFERENCES_KEY);
  localStorage.removeItem('shoumanwu_favorites');
  localStorage.removeItem('shoumanwu_reported_listings');
  localStorage.removeItem('shoumanwu_ios_push_dismissed');
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
