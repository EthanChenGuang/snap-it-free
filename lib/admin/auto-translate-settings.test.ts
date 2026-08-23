import { describe, expect, it } from 'vitest';
import {
  AUTO_TRANSLATE_DEFAULT_INTERVAL_MINUTES,
  clampAutoTranslateInterval,
  parseAutoTranslateSettings,
} from './auto-translate-settings';

describe('clampAutoTranslateInterval', () => {
  it('clamps to configured bounds', () => {
    expect(clampAutoTranslateInterval(0)).toBe(1);
    expect(clampAutoTranslateInterval(999)).toBe(60);
    expect(clampAutoTranslateInterval(5.7)).toBe(6);
  });

  it('falls back for invalid values', () => {
    expect(clampAutoTranslateInterval(Number.NaN)).toBe(AUTO_TRANSLATE_DEFAULT_INTERVAL_MINUTES);
  });
});

describe('parseAutoTranslateSettings', () => {
  it('returns defaults for empty input', () => {
    expect(parseAutoTranslateSettings(null)).toEqual({
      enabled: false,
      intervalMinutes: AUTO_TRANSLATE_DEFAULT_INTERVAL_MINUTES,
    });
  });

  it('parses enabled flag and interval', () => {
    expect(parseAutoTranslateSettings(JSON.stringify({ enabled: true, intervalMinutes: 10 }))).toEqual({
      enabled: true,
      intervalMinutes: 10,
    });
  });

  it('recovers from invalid json', () => {
    expect(parseAutoTranslateSettings('{bad')).toEqual({
      enabled: false,
      intervalMinutes: AUTO_TRANSLATE_DEFAULT_INTERVAL_MINUTES,
    });
  });
});
