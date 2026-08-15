/**
 * Facebook admin seed URL matrix (D-18-21/22/23).
 *
 * 2 cities × 3 search queries — discovery-only URLs (no per-category matrix).
 * Padova slug assumed until first manual run validation (D-18-30).
 */
export const FACEBOOK_SEED_CITY_SLUGS = ['venice', 'padova'] as const;

export type FacebookSeedCitySlug = (typeof FACEBOOK_SEED_CITY_SLUGS)[number];

export const FACEBOOK_SEARCH_QUERIES = ['gratis', 'regalo', 'free'] as const;

export type FacebookSearchQuery = (typeof FACEBOOK_SEARCH_QUERIES)[number];

export function buildDefaultFacebookUrl(city: FacebookSeedCitySlug, query: FacebookSearchQuery): string {
  const params = new URLSearchParams({ query, sortBy: 'creation_time_descend' });
  return `https://www.facebook.com/marketplace/${city}/search/?${params.toString()}`;
}

function generateFacebookSeedUrls(): string[] {
  const urls: string[] = [];
  for (const city of FACEBOOK_SEED_CITY_SLUGS) {
    for (const query of FACEBOOK_SEARCH_QUERIES) {
      urls.push(buildDefaultFacebookUrl(city, query));
    }
  }
  return urls;
}

/** Recommended admin seed URLs — Venice + Padova × gratis/regalo/free (6 URLs). */
export const RECOMMENDED_FACEBOOK_SEED_URLS: readonly string[] = generateFacebookSeedUrls();

export const RECOMMENDED_FACEBOOK_SEED_COUNT = RECOMMENDED_FACEBOOK_SEED_URLS.length;
