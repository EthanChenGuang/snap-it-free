import type { AppLanguage } from '@/lib/settings/preferences';
import { resolveCanonicalCategorySlug } from '@/lib/listings/canonical-categories';
import { getSubitoCategoryLabel } from '@/lib/listings/subito-categories';
import type { ListingSource } from '@/lib/listings/types';

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
  /** Pass source when available (ListingRow); defaults to subito for legacy callers. */
  source?: ListingSource;
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
 * Delegates slug resolution to resolveCanonicalCategorySlug (D-16); unknown DB
 * slugs fall through to title inference (D-18). Callers with ListingRow should pass source.
 */
export function resolveListingCategory(
  row: ListingCategoryFieldRow,
  locale: AppLanguage,
): string | null {
  const slug = resolveCanonicalCategorySlug({
    source: row.source ?? 'subito',
    title: row.title,
    category: row.category,
  });
  if (!slug) return null;
  return getSubitoCategoryLabel(slug, locale, {
    translations: {
      category_en: row.category_en,
      category_zh: row.category_zh,
    },
  });
}
