import type { ConsumerCityKey } from '@/lib/geo/italian-cities';
import { DEFAULT_FILTER_PREFS, type FilterPrefs } from '@/lib/filter-prefs/storage';
import type { SubitoRegaloSlug } from '@/lib/admin/subito-regalo-catalog';

/**
 * Onboarding interest chips (quiz Q1). Each maps to the real Subito regalo category slugs the feed
 * filter already uses, so the answers genuinely drive the feed (no cosmetic-only chips). "everything"
 * clears the category filter. `keyword` seeds an honest alert keyword from the picked interests.
 */
export type OnboardingInterest = {
  key: string;
  /** Subito slugs applied to the feed category filter; empty means "no category filter". */
  subitoSlugs: SubitoRegaloSlug[];
  /** Representative lowercase keyword for a seeded alert (Italian, matched against titles). */
  keyword: string | null;
};

export const ONBOARDING_INTERESTS: readonly OnboardingInterest[] = [
  { key: 'furniture', subitoSlugs: ['arredamento-casalinghi'], keyword: 'mobili' },
  { key: 'electronics', subitoSlugs: ['informatica', 'telefonia', 'audio-video'], keyword: 'elettronica' },
  { key: 'clothes', subitoSlugs: ['abbigliamento-accessori'], keyword: 'abbigliamento' },
  { key: 'books', subitoSlugs: ['libri-riviste'], keyword: 'libri' },
  { key: 'home_decor', subitoSlugs: ['giardino-fai-da-te'], keyword: 'casa' },
  { key: 'everything', subitoSlugs: [], keyword: null },
];

export const ONBOARDING_INTEREST_KEYS = ONBOARDING_INTERESTS.map((interest) => interest.key);

const BY_KEY = new Map(ONBOARDING_INTERESTS.map((interest) => [interest.key, interest]));

/** "everything" is exclusive: picking it clears specific interests and vice-versa. */
export function reconcileInterestSelection(current: string[], toggled: string): string[] {
  const has = current.includes(toggled);
  if (toggled === 'everything') return has ? [] : ['everything'];
  const withoutEverything = current.filter((key) => key !== 'everything');
  return has
    ? withoutEverything.filter((key) => key !== toggled)
    : [...withoutEverything, toggled];
}

/**
 * Subito slugs for the feed category filter. "everything", nothing picked, or every specific interest
 * picked all mean "no filter" (empty), so we never over-constrain the feed.
 */
export function interestsToSubitoSlugs(interests: string[]): string[] {
  const specific = ONBOARDING_INTERESTS.filter(
    (interest) => interest.key !== 'everything' && interests.includes(interest.key),
  );
  const allSpecific = ONBOARDING_INTERESTS.filter((interest) => interest.key !== 'everything').length;
  if (interests.includes('everything') || specific.length === 0 || specific.length === allSpecific) {
    return [];
  }
  const slugs = new Set<string>();
  for (const interest of specific) interest.subitoSlugs.forEach((slug) => slugs.add(slug));
  return [...slugs];
}

/** A single lowercase alert keyword when exactly one specific interest is picked, else null (city-only alert). */
export function interestsToAlertKeyword(interests: string[]): string | null {
  const specific = interests.filter((key) => key !== 'everything');
  if (specific.length !== 1) return null;
  return BY_KEY.get(specific[0])?.keyword ?? null;
}

/** Build the filter prefs the onboarding answers imply, layered over the current prefs. */
export function onboardingFilterPrefs(
  base: FilterPrefs,
  answers: { city: ConsumerCityKey | null; interests: string[]; radiusKm: number; locationGranted: boolean },
): FilterPrefs {
  return {
    ...base,
    mode: answers.locationGranted ? 'map' : 'city',
    city: answers.city ?? base.city ?? DEFAULT_FILTER_PREFS.city,
    categories: interestsToSubitoSlugs(answers.interests),
    radiusKm: answers.radiusKm,
    radiusEnabled: answers.locationGranted,
  };
}
