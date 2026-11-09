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
    expect(interestsToSubitoSlugs(['electronics', 'pets', 'kids', 'furniture', 'appliances', 'books', 'clothes'])).toEqual([]);
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

describe('interest chips (Guang, 2026-11-08/09)', () => {
  it('puts "Everything" first, then pets and furniture in their places, in an even grid', async () => {
    const { ONBOARDING_INTERESTS } = await import('./onboarding-interests');
    const keys = ONBOARDING_INTERESTS.map((interest) => interest.key);
    expect(keys.slice(0, 5)).toEqual(['everything', 'electronics', 'pets', 'kids', 'furniture']);
    expect(keys.length % 2).toBe(0);
    expect(ONBOARDING_INTERESTS.find((interest) => interest.key === 'kids')?.subitoSlugs).toEqual(['bambini-giocattoli']);
  });
});

describe('onboardingFilterPrefs with "Other"', () => {
  it('clears the city filter (all cities)', async () => {
    const { onboardingFilterPrefs } = await import('./onboarding-interests');
    const { DEFAULT_FILTER_PREFS } = await import('@/lib/filter-prefs/storage');
    const prefs = onboardingFilterPrefs({ ...DEFAULT_FILTER_PREFS, city: 'milano' }, { city: 'all', interests: [], radiusKm: 10, locationGranted: false });
    expect(prefs.city).toBe('all');
  });
});
