/**
 * Facebook marketplace_listing_category_id → Subito regalo slug mapping (CAT-03).
 *
 * Canonical filter pipeline uses these slugs via resolveCanonicalCategorySlug
 * (source=facebook). Many FB category IDs may map to one Subito slug (D-18-53).
 *
 * Sources: Wave 0 fixture harvest (18-SPIKE, facebook-search-graphql-sample.json),
 * facebook-item-detail-fragment.json. Best-effort seed — not all 17 slugs required (D-18-60).
 *
 * Slug strings must stay aligned with lib/admin/subito-regalo-catalog.ts (no @/
 * import here so scraper can load this module at persist time).
 */
export const FACEBOOK_CATEGORY_TO_SUBITO_SLUG = {
  // Wave 0 fixture: "Sedia ufficio gratis Venezia" search card
  '847807938447238': 'arredamento-casalinghi',
  // Wave 0 fixture: "Libri vari regalo" search card
  '847807938447239': 'libri-riviste',
} as const satisfies Record<string, string>;

export type FacebookMappedSubitoSlug =
  (typeof FACEBOOK_CATEGORY_TO_SUBITO_SLUG)[keyof typeof FACEBOOK_CATEGORY_TO_SUBITO_SLUG];

export function mapFacebookCategoryToSlug(
  categoryId: string | number | null | undefined,
): FacebookMappedSubitoSlug | null {
  if (categoryId == null) return null;
  const key = String(categoryId).trim();
  if (!key) return null;
  return FACEBOOK_CATEGORY_TO_SUBITO_SLUG[key as keyof typeof FACEBOOK_CATEGORY_TO_SUBITO_SLUG] ?? null;
}
