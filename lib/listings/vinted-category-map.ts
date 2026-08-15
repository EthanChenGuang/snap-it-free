/**
 * Vinted catalog_id → Subito regalo slug mapping (CAT-03).
 *
 * Canonical filter pipeline uses these slugs via resolveCanonicalCategorySlug
 * (source=vinted). Many Vinted leaf IDs may map to one Subito slug (D-17-24).
 *
 * Sources: 17-RESEARCH.md Default URL Template table, 17-SPIKE-VINTED-CATALOG.md
 * Wave 0 verified IDs (1918, 3474, 3584), item-detail enrichment samples.
 * TBD slugs use best-effort parent catalog IDs — operator tuning expected.
 *
 * Slug strings must stay aligned with lib/admin/subito-regalo-catalog.ts (no @/
 * import here so scraper can load this module at persist time).
 */
export const VINTED_CATALOG_TO_SUBITO_SLUG = {
  // Wave 0 verified category-page IDs (17-SPIKE-VINTED-CATALOG.md)
  1918: 'arredamento-casalinghi', // Casa
  3474: 'elettrodomestici', // Piccoli elettrodomestici da cucina
  3584: 'informatica', // Accessori per computer

  // 17-RESEARCH.md verified / broad mappings
  1904: 'abbigliamento-accessori', // Donna
  1906: 'abbigliamento-accessori', // Uomo — many-to-one apparel (D-17-24)
  2994: 'informatica', // Elettronica parent — shared by several Subito slugs (D-17-24)

  // Electronics leaf IDs under 2994 — best-effort sub-IDs (operator tuning)
  3661: 'telefonia',
  3560: 'videogiochi',
  3598: 'fotografia',
  3605: 'audio-video',

  // Wave 0 item-detail enrichment leaf samples
  3826: 'arredamento-casalinghi', // vinted-item-detail-fragment.json fixture

  // TBD slugs — best-effort parent catalog IDs (17-RESEARCH.md; operator tuning)
  1193: 'bambini-giocattoli', // Bambini
  2319: 'libri-riviste', // Libri
  4332: 'sport', // Sport e tempo libero
  4376: 'biciclette', // Ciclismo
  1907: 'giardino-fai-da-te', // Giardino e bricolage
  2922: 'hobby-collezionismo', // Collezionismo
  2904: 'animali', // Animali
  2931: 'musica-film', // Musica e media
} as const satisfies Record<number, string>;

export type VintedMappedSubitoSlug =
  (typeof VINTED_CATALOG_TO_SUBITO_SLUG)[keyof typeof VINTED_CATALOG_TO_SUBITO_SLUG];

export function mapVintedCatalogToSlug(
  catalogId: number | null | undefined,
): VintedMappedSubitoSlug | null {
  if (catalogId == null || !Number.isFinite(catalogId)) return null;
  return VINTED_CATALOG_TO_SUBITO_SLUG[catalogId as keyof typeof VINTED_CATALOG_TO_SUBITO_SLUG] ?? null;
}
