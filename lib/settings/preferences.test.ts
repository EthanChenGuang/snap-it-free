import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as detectModule from '@/lib/i18n/detect-browser-language';
import {
  APP_PREFERENCES_KEY,
  __resetPreferencesModuleForTests,
  readAppPreferences,
} from '@/lib/settings/preferences';

describe('readAppPreferences first-visit seeding', () => {
  beforeEach(() => {
    __resetPreferencesModuleForTests();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    __resetPreferencesModuleForTests();
    localStorage.clear();
  });

  it('seeds language from detectBrowserLanguage when localStorage key is absent', () => {
    const detectSpy = vi.spyOn(detectModule, 'detectBrowserLanguage').mockReturnValue('it');

    const prefs = readAppPreferences();

    expect(detectSpy).toHaveBeenCalledTimes(1);
    expect(prefs.language).toBe('it');
    expect(localStorage.getItem(APP_PREFERENCES_KEY)).toContain('"language":"it"');
  });

  it('does not call detectBrowserLanguage when preferences key already exists', () => {
    localStorage.setItem(
      APP_PREFERENCES_KEY,
      JSON.stringify({ language: 'en', appearance: 'light', soundAlerts: false }),
    );
    const detectSpy = vi.spyOn(detectModule, 'detectBrowserLanguage');

    const prefs = readAppPreferences();

    expect(detectSpy).not.toHaveBeenCalled();
    expect(prefs.language).toBe('en');
  });

  it('preserves existing saved language without re-detecting', () => {
    localStorage.setItem(
      APP_PREFERENCES_KEY,
      JSON.stringify({ language: 'en', appearance: 'dark', soundAlerts: true }),
    );
    vi.spyOn(detectModule, 'detectBrowserLanguage').mockReturnValue('it');

    const first = readAppPreferences();
    const second = readAppPreferences();

    expect(first.language).toBe('en');
    expect(second.language).toBe('en');
  });
});
