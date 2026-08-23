export const AUTO_TRANSLATE_STORAGE_KEY = 'snap-it-free-admin-auto-translate-all';

export const AUTO_TRANSLATE_DEFAULT_INTERVAL_MINUTES = 5;
export const AUTO_TRANSLATE_MIN_INTERVAL_MINUTES = 1;
export const AUTO_TRANSLATE_MAX_INTERVAL_MINUTES = 60;

export const AUTO_TRANSLATE_INTERVAL_OPTIONS = [1, 3, 5, 10, 15] as const;

export type AutoTranslateSettings = {
  enabled: boolean;
  intervalMinutes: number;
};

export function clampAutoTranslateInterval(value: number): number {
  if (!Number.isFinite(value)) {
    return AUTO_TRANSLATE_DEFAULT_INTERVAL_MINUTES;
  }
  return Math.min(
    AUTO_TRANSLATE_MAX_INTERVAL_MINUTES,
    Math.max(AUTO_TRANSLATE_MIN_INTERVAL_MINUTES, Math.round(value)),
  );
}

export function parseAutoTranslateSettings(raw: string | null): AutoTranslateSettings {
  if (!raw) {
    return { enabled: false, intervalMinutes: AUTO_TRANSLATE_DEFAULT_INTERVAL_MINUTES };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AutoTranslateSettings>;
    return {
      enabled: Boolean(parsed.enabled),
      intervalMinutes: clampAutoTranslateInterval(
        parsed.intervalMinutes ?? AUTO_TRANSLATE_DEFAULT_INTERVAL_MINUTES,
      ),
    };
  } catch {
    return { enabled: false, intervalMinutes: AUTO_TRANSLATE_DEFAULT_INTERVAL_MINUTES };
  }
}

export function loadAutoTranslateSettings(): AutoTranslateSettings {
  if (typeof window === 'undefined') {
    return { enabled: false, intervalMinutes: AUTO_TRANSLATE_DEFAULT_INTERVAL_MINUTES };
  }
  return parseAutoTranslateSettings(localStorage.getItem(AUTO_TRANSLATE_STORAGE_KEY));
}

export function saveAutoTranslateSettings(settings: AutoTranslateSettings): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(
    AUTO_TRANSLATE_STORAGE_KEY,
    JSON.stringify({
      enabled: settings.enabled,
      intervalMinutes: clampAutoTranslateInterval(settings.intervalMinutes),
    }),
  );
}

export type RetryAllPendingResult = 'skipped' | 'empty' | 'completed' | 'partial' | 'error';

export type AutoTranslateTickResult = RetryAllPendingResult | 'skipped-busy';
