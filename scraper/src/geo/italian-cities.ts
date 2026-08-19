/** Keep in sync with lib/geo/italian-cities.ts (scraper cannot import @/lib). */
export type SubitoCitySlug =
  | 'venezia'
  | 'padova'
  | 'milano'
  | 'firenze'
  | 'roma'
  | 'napoli'
  | 'perugia'
  | 'torino'
  | 'prato';

export type SubitoRegionSlug =
  | 'veneto'
  | 'lombardia'
  | 'toscana'
  | 'lazio'
  | 'campania'
  | 'umbria'
  | 'piemonte';

export type CityBbox = {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
};

export type ItalianCityDefinition = {
  subitoSlug: SubitoCitySlug;
  region: SubitoRegionSlug;
  labelIt: string;
  bbox: CityBbox;
};

export const ITALIAN_CITIES: readonly ItalianCityDefinition[] = [
  {
    subitoSlug: 'venezia',
    region: 'veneto',
    labelIt: 'Venezia',
    bbox: { latMin: 45.0, latMax: 45.7, lngMin: 12.1, lngMax: 12.6 },
  },
  {
    subitoSlug: 'padova',
    region: 'veneto',
    labelIt: 'Padova',
    bbox: { latMin: 45.3, latMax: 45.5, lngMin: 11.7, lngMax: 12.0 },
  },
  {
    subitoSlug: 'milano',
    region: 'lombardia',
    labelIt: 'Milano',
    bbox: { latMin: 45.35, latMax: 45.55, lngMin: 9.0, lngMax: 9.3 },
  },
  {
    subitoSlug: 'firenze',
    region: 'toscana',
    labelIt: 'Firenze',
    bbox: { latMin: 43.7, latMax: 43.85, lngMin: 11.15, lngMax: 11.35 },
  },
  {
    subitoSlug: 'roma',
    region: 'lazio',
    labelIt: 'Roma',
    bbox: { latMin: 41.75, latMax: 42.05, lngMin: 12.35, lngMax: 12.65 },
  },
  {
    subitoSlug: 'napoli',
    region: 'campania',
    labelIt: 'Napoli',
    bbox: { latMin: 40.75, latMax: 40.95, lngMin: 14.1, lngMax: 14.45 },
  },
  {
    subitoSlug: 'perugia',
    region: 'umbria',
    labelIt: 'Perugia',
    bbox: { latMin: 43.0, latMax: 43.22, lngMin: 12.3, lngMax: 12.5 },
  },
  {
    subitoSlug: 'torino',
    region: 'piemonte',
    labelIt: 'Torino',
    bbox: { latMin: 44.95, latMax: 45.15, lngMin: 7.55, lngMax: 7.85 },
  },
  {
    subitoSlug: 'prato',
    region: 'toscana',
    labelIt: 'Prato',
    bbox: { latMin: 43.82, latMax: 43.95, lngMin: 11.02, lngMax: 11.18 },
  },
] as const;

const BY_SUBITO_SLUG = new Map(ITALIAN_CITIES.map((city) => [city.subitoSlug, city]));

export function getCityBySubitoSlug(slug: string): ItalianCityDefinition | undefined {
  return BY_SUBITO_SLUG.get(slug.toLowerCase() as SubitoCitySlug);
}

export function inCityBbox(lat: number, lng: number, city: SubitoCitySlug): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const entry = getCityBySubitoSlug(city);
  if (!entry) return false;
  const { latMin, latMax, lngMin, lngMax } = entry.bbox;
  return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
}

export const REGALO_CATEGORY_PATH_REGEX =
  /^\/annunci-([^/]+)\/regalo\/([^/]+)\/([^/]+)\/\3\/?$/i;

export function parseRegaloCategoryPath(pathname: string): {
  region: SubitoRegionSlug;
  city: SubitoCitySlug;
  categorySlug: string;
} | null {
  const match = pathname.match(REGALO_CATEGORY_PATH_REGEX);
  if (!match) return null;

  const regionRaw = match[1]?.toLowerCase() ?? '';
  const categorySlug = match[2] ?? '';
  const cityRaw = match[3]?.toLowerCase() ?? '';

  const cityEntry = getCityBySubitoSlug(cityRaw);
  if (!cityEntry || cityEntry.region !== regionRaw) return null;

  return {
    region: cityEntry.region,
    city: cityEntry.subitoSlug,
    categorySlug,
  };
}

export function buildRegaloCategoryUrl(
  region: SubitoRegionSlug,
  categorySlug: string,
  city: SubitoCitySlug,
): string {
  const entry = getCityBySubitoSlug(city);
  if (!entry || entry.region !== region) {
    throw new Error(`Invalid regalo city/region pair: ${city}/${region}`);
  }
  return `https://www.subito.it/annunci-${region}/regalo/${categorySlug}/${city}/${city}/`;
}
