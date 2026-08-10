import { SUBITO_REGALO_CATALOG } from '@/lib/admin/subito-regalo-catalog';
import type { AppLanguage } from '@/lib/settings/preferences';
import { inferListingCategory } from './categories';

/** Subito slug filter value — 'all' means no category filter. */
export type SubitoCategoryFilter = string | 'all';

type SubitoListingFilterInput = {
  title: string;
  category?: string | null;
};

type SubitoCategoryTranslationFields = {
  category_en?: string | null;
  category_zh?: string | null;
};

const CATALOG_LABEL_BY_SLUG = new Map(
  SUBITO_REGALO_CATALOG.map((entry) => [entry.slug, entry.labelIt] as const),
);

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

/** OR match across multiple category slugs; empty selection passes all (D-40, D-44). */
export function matchesAnySubitoCategories(
  listing: SubitoListingFilterInput,
  selected: string[],
): boolean {
  if (selected.length === 0) return true;
  return selected.some((slug) => matchesSubitoCategory(listing, slug));
}

/** Italian default label; uses category_en/category_zh when locale ≠ it (D-31). */
export function getSubitoCategoryLabel(
  slug: SubitoCategoryFilter,
  locale: AppLanguage,
  translations?: SubitoCategoryTranslationFields,
): string {
  if (slug === 'all') return 'Tutte';
  if (locale === 'en' && nonEmpty(translations?.category_en)) {
    return translations.category_en;
  }
  if (locale === 'zh' && nonEmpty(translations?.category_zh)) {
    return translations.category_zh;
  }
  return CATALOG_LABEL_BY_SLUG.get(slug as (typeof SUBITO_REGALO_CATALOG)[number]['slug']) ?? slug;
}

function nonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
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

export const SUBITO_CATEGORY_SLUGS = SUBITO_REGALO_CATALOG.map((entry) => entry.slug);
