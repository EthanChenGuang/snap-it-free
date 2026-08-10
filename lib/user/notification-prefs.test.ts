import { describe, expect, it } from 'vitest';
import { isQuietHoursActive } from './notification-prefs';

describe('isQuietHoursActive', () => {
  it('returns true during a same-day window and false outside it', () => {
    const prefs = { dndEnabled: true, quietStart: '09:00', quietEnd: '17:00' };

    expect(isQuietHoursActive(prefs, 12 * 60)).toBe(true);
    expect(isQuietHoursActive(prefs, 8 * 60 + 59)).toBe(false);
    expect(isQuietHoursActive(prefs, 17 * 60)).toBe(false);
  });

  it('returns true during an overnight window that crosses midnight', () => {
    const prefs = { dndEnabled: true, quietStart: '22:00', quietEnd: '08:00' };

    expect(isQuietHoursActive(prefs, 23 * 60 + 30)).toBe(true);
    expect(isQuietHoursActive(prefs, 9 * 60)).toBe(false);
    expect(isQuietHoursActive(prefs, 7 * 60 + 59)).toBe(true);
  });

  it('returns false when dndEnabled is false regardless of window', () => {
    const prefs = { dndEnabled: false, quietStart: '22:00', quietEnd: '08:00' };

    expect(isQuietHoursActive(prefs, 23 * 60 + 30)).toBe(false);
  });

  it('returns false when prefs is undefined', () => {
    expect(isQuietHoursActive(undefined, 23 * 60 + 30)).toBe(false);
  });

  it('returns true when quietStart equals quietEnd (24h always-on)', () => {
    const prefs = { dndEnabled: true, quietStart: '00:00', quietEnd: '00:00' };

    expect(isQuietHoursActive(prefs, 12 * 60)).toBe(true);
  });
});
