import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTER_PREFS } from '@/lib/filter-prefs/storage';
import {
  interestsToAlertKeyword,
  interestsToSubitoSlugs,
  onboardingFilterPrefs,
  reconcileInterestSelection,
} from './onboarding-interests';

describe('reconcileInterestSelection', () => {
  it('adds and removes specific interests', () => {
    expect(reconcileInterestSelection([], 'books')).toEqual(['books']);
    expect(reconcileInterestSelection(['books'], 'books')).toEqual([]);
  });

  it('makes "everything" exclusive both ways', () => {
    expect(reconcileInterestSelection(['books', 'pets'], 'everything')).toEqual(['everything']);
    expect(reconcileInterestSelection(['everything'], 'books')).toEqual(['books']);
    expect(reconcileInterestSelection(['everything'], 'everything')).toEqual([]);
  });
});

describe('interestsToSubitoSlugs', () => {
  it('maps a single interest to its real Subito slugs', () => {
    expect(interestsToSubitoSlugs(['books'])).toEqual(['libri-riviste']);
    expect(interestsToSubitoSlugs(['electronics'])).toEqual(['informatica', 'telefonia', 'audio-video']);
  });

  it('returns no filter for everything, nothing, or all specific interests picked', () => {
    expect(interestsToSubitoSlugs(['everything'])).toEqual([]);
    expect(interestsToSubitoSlugs([])).toEqual([]);
    expect(interestsToSubitoSlugs(['electronics', 'kids', 'appliances', 'books', 'clothes', 'home_decor', 'pets'])).toEqual([]);
  });
});

describe('interestsToAlertKeyword', () => {
  it('only yields a keyword when exactly one specific interest is picked', () => {
    expect(interestsToAlertKeyword(['books'])).toBe('libri');
    expect(interestsToAlertKeyword(['books', 'pets'])).toBeNull();
    expect(interestsToAlertKeyword(['everything'])).toBeNull();
    expect(interestsToAlertKeyword([])).toBeNull();
  });
});

describe('onboardingFilterPrefs', () => {
  it('writes city, interests, radius and location mode into the prefs', () => {
    const prefs = onboardingFilterPrefs(DEFAULT_FILTER_PREFS, {
      city: 'venice',
      interests: ['books'],
      radiusKm: 5,
      locationGranted: true,
    });
    expect(prefs.city).toBe('venice');
    expect(prefs.categories).toEqual(['libri-riviste']);
    expect(prefs.radiusKm).toBe(5);
    expect(prefs.radiusEnabled).toBe(true);
    expect(prefs.mode).toBe('map');
  });

  it('stays in city mode when location was not granted', () => {
    const prefs = onboardingFilterPrefs(DEFAULT_FILTER_PREFS, {
      city: 'padova',
      interests: ['everything'],
      radiusKm: 15,
      locationGranted: false,
    });
    expect(prefs.mode).toBe('city');
    expect(prefs.radiusEnabled).toBe(false);
    expect(prefs.categories).toEqual([]);
  });
});

describe('interest chips (Guang, 2026-11-07)', () => {
  it('has no furniture chip and keeps pets in the bottom row', async () => {
    const { ONBOARDING_INTERESTS } = await import('./onboarding-interests');
    const keys = ONBOARDING_INTERESTS.map((interest) => interest.key);
    expect(keys).not.toContain('furniture');
    expect(keys.indexOf('pets')).toBeGreaterThanOrEqual(keys.length - 2);
    expect(ONBOARDING_INTERESTS.find((interest) => interest.key === 'kids')?.subitoSlugs).toEqual(['bambini-giocattoli']);
  });
});
