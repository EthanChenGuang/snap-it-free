/**
 * Canonical category mapping across listing sources (CAT-01, CAT-03).
 *
 * Canonical IDs are the 17 Subito regalo slugs from SUBITO_REGALO_CATALOG (D-04).
 * Resolution order (D-06): valid DB slug → source stub → title inference → null.
 */
import { SUBITO_REGALO_CATALOG, type SubitoRegaloSlug } from '@/lib/admin/subito-regalo-catalog';
import { inferListingCategory, type ListingCategory } from './categories';
import type { ListingSource } from './types';

export type CanonicalCategoryInput = {
  source: ListingSource;
  title: string;
  category?: string | null;
};

/** PostCategory values from PostForm — keep in sync with components/ugc/PostForm.tsx (D-11). */
export type PostCategory =
  | 'furniture'
  | 'tech'
  | 'books'
  | 'apparel'
  | 'kitchenware'
  | 'others';

/**
 * UGC PostCategory → canonical Subito slug (D-11).
 * Used at insert time; kitchenware and furniture both map to arredamento-casalinghi.
 */
export const POST_CATEGORY_TO_SLUG: Record<PostCategory, SubitoRegaloSlug> = {
  furniture: 'arredamento-casalinghi',
  tech: 'informatica',
  books: 'libri-riviste',
  apparel: 'abbigliamento-accessori',
  kitchenware: 'arredamento-casalinghi',
  others: 'usato',
};

/**
 * Title-inference bucket → canonical Subito slug (D-07 fallback chain).
 * Consolidates legacySlugFromInferred and listing-fields slugMap.
 */
export const INFERRED_CATEGORY_TO_SLUG = {
  furniture: 'arredamento-casalinghi',
  tech: 'informatica',
  apparel: 'abbigliamento-accessori',
  books: 'libri-riviste',
  home_decor: 'arredamento-casalinghi',
} as const satisfies Record<Exclude<ListingCategory, 'All'>, SubitoRegaloSlug>;

const CATALOG_SLUGS = new Set(SUBITO_REGALO_CATALOG.map((entry) => entry.slug));

/** Validates raw DB slug against catalog; rejects unknown slugs (D-18). */
export function normalizeCatalogSlug(raw: string | null | undefined): SubitoRegaloSlug | null {
  if (!raw?.trim()) return null;
  return CATALOG_SLUGS.has(raw as SubitoRegaloSlug) ? (raw as SubitoRegaloSlug) : null;
}

/** Maps UGC PostCategory picker value to canonical slug at insert time (D-11). */
export function mapPostCategoryToSlug(postCategory: PostCategory): SubitoRegaloSlug {
  return POST_CATEGORY_TO_SLUG[postCategory];
}

/**
 * Single resolver API for filter, display, and future folder grouping (D-05).
 * Unknown DB slugs fall through to title inference (D-18); facebook returns null (D-09).
 */
export function resolveCanonicalCategorySlug(
  input: CanonicalCategoryInput,
): SubitoRegaloSlug | null {
  const fromDb = normalizeCatalogSlug(input.category);
  if (fromDb) return fromDb;

  if (input.source === 'facebook') return null;

  const inferred = inferListingCategory(input.title);
  if (inferred) return INFERRED_CATEGORY_TO_SLUG[inferred];

  return null;
}
