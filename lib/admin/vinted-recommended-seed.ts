/**
 * Vinted admin seed URL matrix (D-17-05, D-17-09, D-17-14, D-17-19).
 *
 * D-17-06 resolution: Vinted catalog URLs have no native geo/lat-lng filter params.
 * City scope is encoded as `?city={subitoSlug}` matrix metadata on each seed URL;
 * post-extract validation uses matchesCityIntent + seller JSON (D-17-10), not Vinted
 * location query params.
 *
 * Catalog IDs align with lib/listings/vinted-category-map.ts (Plan 17-04).
 * TBD / usato entries use best-effort parent IDs — operator tuning expected.
 */
import {
  SUBITO_REGALO_CATALOG,
  SUBITO_CITY_SLUGS,
  type SubitoRegaloSlug,
} from './subito-regalo-catalog';
import type { SubitoCitySlug } from '@/lib/geo/italian-cities';

/** Same 13 cities as Subito regalo matrix (260815-fjs italian-cities). */
export const VINTED_SEED_CITY_SLUGS = SUBITO_CITY_SLUGS;

export type VintedSeedCitySlug = SubitoCitySlug;

type VintedCatalogSeed = {
  catalogId: number;
  /** Cosmetic path segment after catalog ID; API uses numeric ID only. */
  pathSlug: string;
};

/** One Vinted catalog template per Subito regalo slug (17 rows). */
export const VINTED_SEED_BY_SUBITO_SLUG: Record<SubitoRegaloSlug, VintedCatalogSeed> = {
  'arredamento-casalinghi': { catalogId: 1918, pathSlug: 'casa' },
  elettrodomestici: { catalogId: 3474, pathSlug: 'piccoli-elettrodomestici-da-cucina' },
  'bambini-giocattoli': { catalogId: 1193, pathSlug: 'bambini' },
  'abbigliamento-accessori': { catalogId: 1904, pathSlug: 'donna' },
  'libri-riviste': { catalogId: 2319, pathSlug: 'libri' },
  informatica: { catalogId: 3584, pathSlug: 'accessori-per-computer' },
  'giardino-fai-da-te': { catalogId: 1907, pathSlug: 'giardino-e-bricolage' },
  sport: { catalogId: 4332, pathSlug: 'sport-e-tempo-libero' },
  'hobby-collezionismo': { catalogId: 2922, pathSlug: 'collezionismo' },
  biciclette: { catalogId: 4376, pathSlug: 'ciclismo' },
  'audio-video': { catalogId: 3605, pathSlug: 'audio-cuffie-e-hi-fi' },
  telefonia: { catalogId: 3661, pathSlug: 'telefoni' },
  'musica-film': { catalogId: 2931, pathSlug: 'musica-e-media' },
  fotografia: { catalogId: 3598, pathSlug: 'fotocamere' },
  videogiochi: { catalogId: 3560, pathSlug: 'videogiochi-e-console' },
  animali: { catalogId: 2904, pathSlug: 'animali' },
  /** No Vinted equivalent — broad apparel seed; category resolved via inference at persist (D-17-18). */
  usato: { catalogId: 1904, pathSlug: 'donna' },
};

export function buildDefaultVintedUrl(subitoSlug: SubitoRegaloSlug, city: VintedSeedCitySlug): string {
  const seed = VINTED_SEED_BY_SUBITO_SLUG[subitoSlug];
  const base = `https://www.vinted.it/catalog/${seed.catalogId}-${seed.pathSlug}`;
  const params = new URLSearchParams({ order: 'newest_first', city });
  return `${base}?${params.toString()}`;
}

function generateVintedSeedUrls(): string[] {
  const slugs = SUBITO_REGALO_CATALOG.map((entry) => entry.slug);
  const urls: string[] = [];
  for (const city of VINTED_SEED_CITY_SLUGS) {
    for (const slug of slugs) {
      urls.push(buildDefaultVintedUrl(slug, city));
    }
  }
  return urls;
}

/** Recommended admin seed URLs — 17 categories × 13 cities (221 URLs). */
export const RECOMMENDED_VINTED_SEED_URLS: readonly string[] = generateVintedSeedUrls();

export const RECOMMENDED_VINTED_SEED_COUNT = RECOMMENDED_VINTED_SEED_URLS.length;
