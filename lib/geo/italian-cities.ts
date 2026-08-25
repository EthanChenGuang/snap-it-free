/** Subito regalo scrape targets + consumer city filter keys. */
export type SubitoCitySlug =
  | 'venezia'
  | 'padova'
  | 'milano'
  | 'firenze'
  | 'roma'
  | 'napoli'
  | 'perugia'
  | 'torino'
  | 'prato'
  | 'bologna'
  | 'brescia'
  | 'genova'
  | 'verona';

export type SubitoRegionSlug =
  | 'veneto'
  | 'lombardia'
  | 'toscana'
  | 'lazio'
  | 'campania'
  | 'umbria'
  | 'piemonte'
  | 'emilia-romagna'
  | 'liguria';

/** Consumer filter/storage keys — `venice` kept for Venice zone listings. */
export type ConsumerCityKey =
  | 'venice'
  | 'padova'
  | 'milano'
  | 'firenze'
  | 'roma'
  | 'napoli'
  | 'perugia'
  | 'torino'
  | 'prato'
  | 'bologna'
  | 'brescia'
  | 'genova'
  | 'verona';

export type CityBbox = {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
};

export type ItalianCityDefinition = {
  subitoSlug: SubitoCitySlug;
  region: SubitoRegionSlug;
  consumerKey: ConsumerCityKey;
  /** Italian display name for admin UI. */
  labelIt: string;
  bbox: CityBbox;
};

export const ITALIAN_CITIES: readonly ItalianCityDefinition[] = [
  {
    subitoSlug: 'venezia',
    region: 'veneto',
    consumerKey: 'venice',
    labelIt: 'Venezia',
    bbox: { latMin: 45.0, latMax: 45.7, lngMin: 12.1, lngMax: 12.6 },
  },
  {
    subitoSlug: 'padova',
    region: 'veneto',
    consumerKey: 'padova',
    labelIt: 'Padova',
    bbox: { latMin: 45.3, latMax: 45.5, lngMin: 11.7, lngMax: 12.0 },
  },
  {
    subitoSlug: 'milano',
    region: 'lombardia',
    consumerKey: 'milano',
    labelIt: 'Milano',
    bbox: { latMin: 45.35, latMax: 45.55, lngMin: 9.0, lngMax: 9.3 },
  },
  {
    subitoSlug: 'firenze',
    region: 'toscana',
    consumerKey: 'firenze',
    labelIt: 'Firenze',
    bbox: { latMin: 43.7, latMax: 43.85, lngMin: 11.15, lngMax: 11.35 },
  },
  {
    subitoSlug: 'roma',
    region: 'lazio',
    consumerKey: 'roma',
    labelIt: 'Roma',
    bbox: { latMin: 41.75, latMax: 42.05, lngMin: 12.35, lngMax: 12.65 },
  },
  {
    subitoSlug: 'napoli',
    region: 'campania',
    consumerKey: 'napoli',
    labelIt: 'Napoli',
    bbox: { latMin: 40.75, latMax: 40.95, lngMin: 14.1, lngMax: 14.45 },
  },
  {
    subitoSlug: 'perugia',
    region: 'umbria',
    consumerKey: 'perugia',
    labelIt: 'Perugia',
    bbox: { latMin: 43.0, latMax: 43.22, lngMin: 12.3, lngMax: 12.5 },
  },
  {
    subitoSlug: 'torino',
    region: 'piemonte',
    consumerKey: 'torino',
    labelIt: 'Torino',
    bbox: { latMin: 44.95, latMax: 45.15, lngMin: 7.55, lngMax: 7.85 },
  },
  {
    subitoSlug: 'prato',
    region: 'toscana',
    consumerKey: 'prato',
    labelIt: 'Prato',
    bbox: { latMin: 43.82, latMax: 43.95, lngMin: 11.02, lngMax: 11.18 },
  },
  {
    subitoSlug: 'bologna',
    region: 'emilia-romagna',
    consumerKey: 'bologna',
    labelIt: 'Bologna',
    bbox: { latMin: 44.37, latMax: 44.61, lngMin: 11.19, lngMax: 11.49 },
  },
  {
    subitoSlug: 'brescia',
    region: 'lombardia',
    consumerKey: 'brescia',
    labelIt: 'Brescia',
    bbox: { latMin: 45.42, latMax: 45.66, lngMin: 10.07, lngMax: 10.37 },
  },
  {
    subitoSlug: 'genova',
    region: 'liguria',
    consumerKey: 'genova',
    labelIt: 'Genova',
    bbox: { latMin: 44.29, latMax: 44.53, lngMin: 8.78, lngMax: 9.08 },
  },
  {
    subitoSlug: 'verona',
    region: 'veneto',
    consumerKey: 'verona',
    labelIt: 'Verona',
    bbox: { latMin: 45.32, latMax: 45.56, lngMin: 10.84, lngMax: 11.14 },
  },
] as const;

export const SUBITO_CITY_SLUGS = ITALIAN_CITIES.map((city) => city.subitoSlug);
export const CONSUMER_CITY_KEYS = ITALIAN_CITIES.map((city) => city.consumerKey);

const BY_SUBITO_SLUG = new Map(ITALIAN_CITIES.map((city) => [city.subitoSlug, city]));
const BY_CONSUMER_KEY = new Map(ITALIAN_CITIES.map((city) => [city.consumerKey, city]));

export function getCityBySubitoSlug(slug: string): ItalianCityDefinition | undefined {
  return BY_SUBITO_SLUG.get(slug.toLowerCase() as SubitoCitySlug);
}

export function getCityByConsumerKey(key: string): ItalianCityDefinition | undefined {
  return BY_CONSUMER_KEY.get(key.toLowerCase() as ConsumerCityKey);
}

export function isSubitoCitySlug(value: string): value is SubitoCitySlug {
  return BY_SUBITO_SLUG.has(value.toLowerCase() as SubitoCitySlug);
}

export function isConsumerCityKey(value: string): value is ConsumerCityKey {
  return BY_CONSUMER_KEY.has(value.toLowerCase() as ConsumerCityKey);
}

export function inCityBbox(lat: number, lng: number, city: SubitoCitySlug): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const entry = getCityBySubitoSlug(city);
  if (!entry) return false;
  const { latMin, latMax, lngMin, lngMax } = entry.bbox;
  return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
}

/** Bbox center for listings_public D-28 fallback when Subito omits coords. */
export function cityBboxCenter(city: SubitoCitySlug): { lat: number; lng: number } {
  const entry = getCityBySubitoSlug(city);
  if (!entry) {
    throw new Error(`Unknown city slug: ${city}`);
  }
  const { latMin, latMax, lngMin, lngMax } = entry.bbox;
  return {
    lat: (latMin + latMax) / 2,
    lng: (lngMin + lngMax) / 2,
  };
}

/** Generic Subito regalo path — region/city validated against catalog. */
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
