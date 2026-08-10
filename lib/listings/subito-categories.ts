import { SUBITO_REGALO_CATALOG } from '@/lib/admin/subito-regalo-catalog';
import type { Messages } from '@/messages';
import type { AppLanguage } from '@/lib/settings/preferences';
import { resolveCanonicalCategorySlug } from './canonical-categories';
import type { ListingSource } from './types';

/** Subito slug filter value — 'all' means no category filter. */
export type SubitoCategoryFilter = string | 'all';

type SubitoListingFilterInput = {
  source?: ListingSource;
  title: string;
  category?: string | null;
};

type SubitoCategoryTranslationFields = {
  category_en?: string | null;
  category_zh?: string | null;
};

type SubitoCategoryLabelOptions = {
  messages?: Messages;
  translations?: SubitoCategoryTranslationFields;
};

const CATALOG_LABEL_BY_SLUG = new Map(
  SUBITO_REGALO_CATALOG.map((entry) => [entry.slug, entry.labelIt] as const),
);

/** Delegates to resolveCanonicalCategorySlug for catalog-valid slug matching (D-05). */
export function matchesSubitoCategory(
  listing: SubitoListingFilterInput,
  selected: SubitoCategoryFilter,
): boolean {
  if (selected === 'all') return true;
  const resolved = resolveCanonicalCategorySlug({
    source: listing.source ?? 'subito',
    title: listing.title,
    category: listing.category,
  });
  return resolved === selected;
}

/** OR match across multiple category slugs; empty selection passes all (D-40, D-44). */
export function matchesAnySubitoCategories(
  listing: SubitoListingFilterInput,
  selected: string[],
): boolean {
  if (selected.length === 0) return true;
  return selected.some((slug) => matchesSubitoCategory(listing, slug));
}

/** Resolve locale-aware label: messages map → DB columns → catalog fallback (D-31 / 12.1). */
export function getSubitoCategoryLabel(
  slug: SubitoCategoryFilter,
  locale: AppLanguage,
  options?: SubitoCategoryLabelOptions,
): string | null {
  if (slug === 'all') {
    return options?.messages?.feed.cityAll ?? 'Tutte';
  }

  if (locale === 'en' && nonEmpty(options?.translations?.category_en)) {
    return options.translations.category_en;
  }
  if (locale === 'zh' && nonEmpty(options?.translations?.category_zh)) {
    return options.translations.category_zh;
  }

  const fromMessages = options?.messages?.feed.subitoCategories?.[
    slug as (typeof SUBITO_REGALO_CATALOG)[number]['slug']
  ];
  if (nonEmpty(fromMessages)) {
    return fromMessages;
  }

  return (
    CATALOG_LABEL_BY_SLUG.get(slug as (typeof SUBITO_REGALO_CATALOG)[number]['slug']) ?? null
  );
}

function nonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export const SUBITO_CATEGORY_SLUGS = SUBITO_REGALO_CATALOG.map((entry) => entry.slug);
