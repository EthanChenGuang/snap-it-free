import {
  ITALIAN_CITIES,
  cityBboxCenter,
  inCityBbox,
  type ConsumerCityKey,
  type ItalianCityDefinition,
  type SubitoCitySlug,
} from '@/lib/geo/italian-cities';

export type PickupLocationResolution = {
  /** Catalog city when coordinates fall inside its bbox; otherwise null (→ feed "other"). */
  catalogCity: ItalianCityDefinition | null;
  /** Nearest catalog city by bbox-center distance — used for display labels. */
  nearestCity: ItalianCityDefinition;
  consumerKey: ConsumerCityKey | null;
  isOther: boolean;
};

const PICKUP_BOUNDS = ITALIAN_CITIES.reduce(
  (acc, city) => ({
    latMin: Math.min(acc.latMin, city.bbox.latMin),
    latMax: Math.max(acc.latMax, city.bbox.latMax),
    lngMin: Math.min(acc.lngMin, city.bbox.lngMin),
    lngMax: Math.max(acc.lngMax, city.bbox.lngMax),
  }),
  {
    latMin: Number.POSITIVE_INFINITY,
    latMax: Number.NEGATIVE_INFINITY,
    lngMin: Number.POSITIVE_INFINITY,
    lngMax: Number.NEGATIVE_INFINITY,
  },
);

/** Slightly padded union of supported city bboxes — UGC pickup allowed area. */
export const UGC_PICKUP_LAT_MIN = PICKUP_BOUNDS.latMin - 0.15;
export const UGC_PICKUP_LAT_MAX = PICKUP_BOUNDS.latMax + 0.15;
export const UGC_PICKUP_LNG_MIN = PICKUP_BOUNDS.lngMin - 0.15;
export const UGC_PICKUP_LNG_MAX = PICKUP_BOUNDS.lngMax + 0.15;

export function isWithinUgcPickupBounds(lat: number, lng: number): boolean {
  return (
    lat >= UGC_PICKUP_LAT_MIN &&
    lat <= UGC_PICKUP_LAT_MAX &&
    lng >= UGC_PICKUP_LNG_MIN &&
    lng <= UGC_PICKUP_LNG_MAX
  );
}

export function findCatalogCityAt(lat: number, lng: number): ItalianCityDefinition | null {
  for (const city of ITALIAN_CITIES) {
    if (inCityBbox(lat, lng, city.subitoSlug)) return city;
  }
  return null;
}

export function nearestCatalogCity(lat: number, lng: number): ItalianCityDefinition {
  let best = ITALIAN_CITIES[0]!;
  let bestDist = Infinity;

  for (const city of ITALIAN_CITIES) {
    const center = cityBboxCenter(city.subitoSlug);
    const dist = (lat - center.lat) ** 2 + (lng - center.lng) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = city;
    }
  }

  return best;
}

export function resolvePickupLocation(lat: number, lng: number): PickupLocationResolution {
  const catalogCity = findCatalogCityAt(lat, lng);
  const nearestCity = nearestCatalogCity(lat, lng);

  return {
    catalogCity,
    nearestCity,
    consumerKey: catalogCity?.consumerKey ?? null,
    isOther: catalogCity == null,
  };
}

/** DB row fields derived from a pickup resolution (shared by API + tests). */
export function pickupFieldsForInsert(resolved: PickupLocationResolution): {
  city: SubitoCitySlug | null;
  region: ItalianCityDefinition['region'] | null;
} {
  if (resolved.catalogCity) {
    return {
      city: resolved.catalogCity.subitoSlug,
      region: resolved.catalogCity.region,
    };
  }
  // Outside catalog bboxes → feed "other" (listingConsumerCity returns null).
  // Nearest slug kept for listings_public visibility (zone null + city required).
  return {
    city: resolved.nearestCity.subitoSlug,
    region: resolved.nearestCity.region,
  };
}
