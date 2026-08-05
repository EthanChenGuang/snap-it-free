import {
  SUBITO_REGALO_CATALOG,
  buildRegaloCategoryUrl,
  generateRegaloUrls,
} from './subito-regalo-catalog';

/**
 * D-15 gate — mirrors 08-PADOVA-SPIKE.md verdict.
 * Set true only when spike artifact contains `**Verdict:** PASS`.
 * Current: FAIL (2026-08-05) — Venice-only seed until coords pass.
 */
export const PADOVA_SPIKE_PASS = false;

const VENEZIA_SEED_URLS = generateRegaloUrls(
  ['venezia'],
  SUBITO_REGALO_CATALOG.map((entry) => entry.slug),
);

const PADOVA_SEED_URLS = generateRegaloUrls(
  ['padova'],
  SUBITO_REGALO_CATALOG.map((entry) => entry.slug),
);

/** Recommended admin seed URLs (17 Venice-only when spike FAIL; 34 when PASS). */
export const RECOMMENDED_SUBITO_SEED_URLS: readonly string[] = PADOVA_SPIKE_PASS
  ? [...VENEZIA_SEED_URLS, ...PADOVA_SEED_URLS]
  : VENEZIA_SEED_URLS;

export const RECOMMENDED_SEED_COUNT = RECOMMENDED_SUBITO_SEED_URLS.length;

/** Sample URL for tests and docs. */
export const SAMPLE_REGALO_URL = buildRegaloCategoryUrl('veneto', 'informatica', 'padova');
