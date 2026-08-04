import type { AppLanguage } from '@/lib/settings/preferences';

/** Listing row fields used for locale-aware title/description display (D-133). */
export type ListingFieldRow = {
  title: string;
  title_en?: string | null;
  title_zh?: string | null;
  description?: string | null;
  description_en?: string | null;
  description_zh?: string | null;
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
