import type { AppLanguage } from '@/lib/settings/preferences';
import { getSubitoCategoryLabel } from '@/lib/listings/subito-categories';
import { inferListingCategory } from '@/lib/listings/categories';

/** Listing row fields used for locale-aware title/description display (D-133). */
export type ListingFieldRow = {
  title: string;
  title_en?: string | null;
  title_zh?: string | null;
  description?: string | null;
  description_en?: string | null;
  description_zh?: string | null;
};

export type ListingCategoryFieldRow = ListingFieldRow & {
  category?: string | null;
  category_en?: string | null;
  category_zh?: string | null;
};

function nonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Resolve listing title for display by active locale.
 * en → title_en ?? title; zh → title_zh ?? title; it → title (Italian original).
 * UGC listings without translation columns always return the user-authored title.
 */
export function resolveListingTitle(row: ListingFieldRow, locale: AppLanguage): string {
  if (locale === 'en' && nonEmpty(row.title_en)) {
    return row.title_en;
  }
  if (locale === 'zh' && nonEmpty(row.title_zh)) {
    return row.title_zh;
  }
  return row.title;
}

/**
 * Resolve listing description for display by active locale.
 * Same fallback pattern as resolveListingTitle; returns null when no description available.
 */
export function resolveListingDescription(
  row: ListingFieldRow,
  locale: AppLanguage,
): string | null {
  if (locale === 'en' && nonEmpty(row.description_en)) {
    return row.description_en;
  }
  if (locale === 'zh' && nonEmpty(row.description_zh)) {
    return row.description_zh;
  }
  if (nonEmpty(row.description)) {
    return row.description;
  }
  return null;
}

/**
 * Resolve listing category badge label for display by active locale (D-31).
 * DB slug → category_en/category_zh when populated; Italian catalog fallback.
 * Title keyword inference only when category column is null.
 */
export function resolveListingCategory(
  row: ListingCategoryFieldRow,
  locale: AppLanguage,
): string | null {
  if (nonEmpty(row.category)) {
    return getSubitoCategoryLabel(row.category, locale, {
      category_en: row.category_en,
      category_zh: row.category_zh,
    });
  }
  const inferred = inferListingCategory(row.title);
  if (!inferred) return null;
  const slugMap: Record<Exclude<import('@/lib/listings/categories').ListingCategory, 'All'>, string> = {
    furniture: 'arredamento-casalinghi',
    tech: 'informatica',
    apparel: 'abbigliamento-accessori',
    books: 'libri-riviste',
    home_decor: 'arredamento-casalinghi',
  };
  return getSubitoCategoryLabel(slugMap[inferred], locale);
}
