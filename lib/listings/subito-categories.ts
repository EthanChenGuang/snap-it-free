import { inferListingCategory } from './categories';

/** Subito slug filter value — 'all' means no category filter. */
export type SubitoCategoryFilter = string | 'all';

type SubitoListingFilterInput = {
  title: string;
  category?: string | null;
};

/**
 * Prefer DB `listing.category` slug over title keyword inference (D-29).
 * Title inference is fallback only when category column is null.
 */
export function matchesSubitoCategory(
  listing: SubitoListingFilterInput,
  selected: SubitoCategoryFilter,
): boolean {
  if (selected === 'all') return true;
  if (listing.category) {
    return listing.category === selected;
  }
  const inferred = inferListingCategory(listing.title);
  if (!inferred) return false;
  return legacySlugFromInferred(inferred) === selected;
}

/** Maps legacy title-inference buckets to nearest Subito slug for fallback only. */
function legacySlugFromInferred(inferred: Exclude<import('./categories').ListingCategory, 'All'>): string {
  const map: Record<Exclude<import('./categories').ListingCategory, 'All'>, string> = {
    furniture: 'arredamento-casalinghi',
    tech: 'informatica',
    apparel: 'abbigliamento-accessori',
    books: 'libri-riviste',
    home_decor: 'arredamento-casalinghi',
  };
  return map[inferred];
}
