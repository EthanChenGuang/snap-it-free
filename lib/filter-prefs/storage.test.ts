import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_FILTER_PREFS,
  FILTER_PREFS_STORAGE_KEY,
  readFilterPrefs,
  subscribeFilterPrefs,
  writeFilterPrefs,
} from './storage';

describe('readFilterPrefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns DEFAULT_FILTER_PREFS when storage empty (D-14, D-16, D-76)', () => {
    expect(readFilterPrefs()).toEqual({
      mode: 'city',
      radiusKm: 10,
      radiusEnabled: false,
      city: 'all',
      categories: [],
    });
    expect(readFilterPrefs()).toEqual(DEFAULT_FILTER_PREFS);
  });

  it('returns defaults when JSON is corrupt', () => {
    localStorage.setItem(FILTER_PREFS_STORAGE_KEY, '{not-json');
    expect(readFilterPrefs()).toEqual(DEFAULT_FILTER_PREFS);
  });

  it('returns defaults when window is undefined (SSR guard)', () => {
    const windowSpy = vi.spyOn(globalThis, 'window', 'get').mockReturnValue(undefined as never);
    expect(readFilterPrefs()).toEqual(DEFAULT_FILTER_PREFS);
    windowSpy.mockRestore();
  });
});

describe('writeFilterPrefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips values via readFilterPrefs', () => {
    const prefs = {
      mode: 'map' as const,
      radiusKm: 50,
      radiusEnabled: true,
      city: 'all' as const,
      categories: ['informatica', 'arredamento-casalinghi'],
    };
    writeFilterPrefs(prefs);
    expect(readFilterPrefs()).toEqual(prefs);
  });

  it('clamps radiusKm to 1–100 range', () => {
    writeFilterPrefs({ ...DEFAULT_FILTER_PREFS, radiusKm: 0 });
    expect(readFilterPrefs().radiusKm).toBe(1);

    writeFilterPrefs({ ...DEFAULT_FILTER_PREFS, radiusKm: 150 });
    expect(readFilterPrefs().radiusKm).toBe(100);
  });

  it('infers map mode from legacy radiusEnabled storage', () => {
    localStorage.setItem(
      FILTER_PREFS_STORAGE_KEY,
      JSON.stringify({ radiusKm: 10, radiusEnabled: true, city: 'all', categories: [] }),
    );
    expect(readFilterPrefs().mode).toBe('map');
  });

  it('coerces invalid city string to all', () => {
    localStorage.setItem(
      FILTER_PREFS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_FILTER_PREFS, city: 'invalid' }),
    );
    expect(readFilterPrefs().city).toBe('all');
  });

  it('filters categories to strings only', () => {
    localStorage.setItem(
      FILTER_PREFS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_FILTER_PREFS,
        categories: ['informatica', 42, null, 'furniture'],
      }),
    );
    expect(readFilterPrefs().categories).toEqual(['informatica', 'furniture']);
  });

  it('round-trips other city filter', () => {
    writeFilterPrefs({ ...DEFAULT_FILTER_PREFS, city: 'other' });
    expect(readFilterPrefs().city).toBe('other');
  });

  it('dispatches change event on write', () => {
    const handler = vi.fn();
    window.addEventListener('shoumanwu-filter-prefs-change', handler);
    writeFilterPrefs({ ...DEFAULT_FILTER_PREFS, city: 'padova' });
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener('shoumanwu-filter-prefs-change', handler);
  });
});

describe('subscribeFilterPrefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('fires on writeFilterPrefs', () => {
    const handler = vi.fn();
    const unsubscribe = subscribeFilterPrefs(handler);
    writeFilterPrefs({ ...DEFAULT_FILTER_PREFS, radiusEnabled: true });
    expect(handler).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
