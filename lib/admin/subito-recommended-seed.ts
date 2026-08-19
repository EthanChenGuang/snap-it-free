import {
  SUBITO_REGALO_CATALOG,
  SUBITO_CITY_SLUGS,
  buildRegaloCategoryUrl,
  generateRegaloUrls,
} from './subito-regalo-catalog';

/**
 * D-15 gate — mirrors 08-PADOVA-SPIKE.md verdict.
 * Set true only when spike artifact contains `**Verdict:** PASS`.
 */
export const PADOVA_SPIKE_PASS = true;

const ALL_CATEGORY_SLUGS = SUBITO_REGALO_CATALOG.map((entry) => entry.slug);

/** Recommended admin seed URLs — 17 categories × supported cities. */
export const RECOMMENDED_SUBITO_SEED_URLS: readonly string[] = generateRegaloUrls(
  SUBITO_CITY_SLUGS,
  ALL_CATEGORY_SLUGS,
);

export const RECOMMENDED_SEED_COUNT = RECOMMENDED_SUBITO_SEED_URLS.length;

/** Sample URL for tests and docs. */
export const SAMPLE_REGALO_URL = buildRegaloCategoryUrl('veneto', 'informatica', 'padova');
