/** Canonical regalo path parsing — must stay in sync with lib/geo/italian-cities.ts (D-03). */
export {
  REGALO_CATEGORY_PATH_REGEX as REGALO_CATEGORY_URL_REGEX,
  buildRegaloCategoryUrl,
  getCityBySubitoSlug,
  inCityBbox,
  parseRegaloCategoryPath,
  type SubitoCitySlug,
  type SubitoRegionSlug,
} from '../geo/italian-cities.js';

import { parseRegaloCategoryPath } from '../geo/italian-cities.js';

/** Parse region, city, and category slug from a Subito regalo category listing URL. */
export function parseRegaloCategoryUrl(url: string): {
  region: string;
  city: string;
  categorySlug: string;
} | null {
  try {
    const { pathname } = new URL(url);
    const parsed = parseRegaloCategoryPath(pathname);
    if (!parsed) return null;
    return parsed;
  } catch {
    return null;
  }
}
