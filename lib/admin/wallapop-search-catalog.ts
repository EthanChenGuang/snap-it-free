import {
  cityBboxCenter,
  ITALIAN_CITIES,
  SUBITO_CITY_SLUGS,
  type SubitoCitySlug,
} from '@/lib/geo/italian-cities';
import { dedupeUrls } from './subito-regalo-catalog';

export const WALLAPOP_SEED_CITY_SLUGS = SUBITO_CITY_SLUGS;
export type WallapopSeedCitySlug = SubitoCitySlug;

export const WALLAPOP_SEARCH_ORIGIN = 'https://it.wallapop.com';

export const WALLAPOP_SEARCH_DEFAULTS = {
  maxSalePrice: '0',
  distanceInKm: '15',
  orderBy: 'newest',
} as const;

export type BuildWallapopSearchUrlOptions = {
  maxSalePrice?: string;
  distanceInKm?: string;
  orderBy?: string;
  keywords?: string;
};

/** Admin seed URL — one per city with bbox center coords (D-25-02). */
export function buildWallapopSearchUrl(
  city: WallapopSeedCitySlug,
  options: BuildWallapopSearchUrlOptions = {},
): string {
  const { lat, lng } = cityBboxCenter(city);
  const params = new URLSearchParams({
    max_sale_price: options.maxSalePrice ?? WALLAPOP_SEARCH_DEFAULTS.maxSalePrice,
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    distance_in_km: options.distanceInKm ?? WALLAPOP_SEARCH_DEFAULTS.distanceInKm,
    order_by: options.orderBy ?? WALLAPOP_SEARCH_DEFAULTS.orderBy,
    city,
  });
  const keywords = options.keywords?.trim();
  if (keywords) {
    params.set('keywords', keywords);
  }
  return `${WALLAPOP_SEARCH_ORIGIN}/search?${params.toString()}`;
}

export function generateWallapopSearchUrls(
  cities: readonly WallapopSeedCitySlug[],
  options: BuildWallapopSearchUrlOptions = {},
): string[] {
  return dedupeUrls(cities.map((city) => buildWallapopSearchUrl(city, options)));
}

export function parseWallapopSearchUrl(url: string): { city: WallapopSeedCitySlug } | null {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)wallapop\.com$/i.test(parsed.hostname)) {
      return null;
    }
    const cityParam = parsed.searchParams.get('city')?.trim().toLowerCase();
    if (cityParam && WALLAPOP_SEED_CITY_SLUGS.includes(cityParam as WallapopSeedCitySlug)) {
      return { city: cityParam as WallapopSeedCitySlug };
    }
    const lat = Number.parseFloat(parsed.searchParams.get('latitude') ?? '');
    const lng = Number.parseFloat(parsed.searchParams.get('longitude') ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    for (const city of WALLAPOP_SEED_CITY_SLUGS) {
      const center = cityBboxCenter(city);
      if (
        Math.abs(center.lat - lat) < 0.05 &&
        Math.abs(center.lng - lng) < 0.05
      ) {
        return { city };
      }
    }
    return null;
  } catch {
    return null;
  }
}

const GENERATED_WALLAPOP_URLS = new Set(
  WALLAPOP_SEED_CITY_SLUGS.map((city) => buildWallapopSearchUrl(city)),
);

/** Keep manual lines that are not generated Wallapop city templates. */
export function mergeGeneratedWallapopUrls(generated: string[], existingText: string): string[] {
  const manualLines = existingText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !GENERATED_WALLAPOP_URLS.has(line));

  return dedupeUrls([...generated, ...manualLines]);
}

export const RECOMMENDED_WALLAPOP_SEED_URLS: readonly string[] = generateWallapopSearchUrls(
  WALLAPOP_SEED_CITY_SLUGS,
);

export const WALLAPOP_CITY_LABELS = Object.fromEntries(
  ITALIAN_CITIES.map((city) => [city.subitoSlug, city.labelIt]),
) as Record<WallapopSeedCitySlug, string>;
