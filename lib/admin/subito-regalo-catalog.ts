/** 17 verified Subito regalo category slugs with Italian labels (08-UI-SPEC). */
export const SUBITO_REGALO_CATALOG = [
  { slug: 'arredamento-casalinghi', labelIt: 'Arredamento e Casalinghi' },
  { slug: 'elettrodomestici', labelIt: 'Elettrodomestici' },
  { slug: 'bambini-giocattoli', labelIt: 'Tutto per i bambini' },
  { slug: 'abbigliamento-accessori', labelIt: 'Abbigliamento e Accessori' },
  { slug: 'libri-riviste', labelIt: 'Libri e Riviste' },
  { slug: 'informatica', labelIt: 'Informatica' },
  { slug: 'giardino-fai-da-te', labelIt: 'Giardino e Fai da te' },
  { slug: 'sport', labelIt: 'Sports' },
  { slug: 'hobby-collezionismo', labelIt: 'Collezionismo' },
  { slug: 'biciclette', labelIt: 'Biciclette' },
  { slug: 'audio-video', labelIt: 'Audio/Video' },
  { slug: 'telefonia', labelIt: 'Telefonia' },
  { slug: 'musica-film', labelIt: 'Musica e Film' },
  { slug: 'fotografia', labelIt: 'Fotografia' },
  { slug: 'videogiochi', labelIt: 'Console e Videogiochi' },
  { slug: 'animali', labelIt: 'Animali' },
  { slug: 'usato', labelIt: 'Altro' },
] as const;

export type SubitoRegaloSlug = (typeof SUBITO_REGALO_CATALOG)[number]['slug'];

export {
  ITALIAN_CITIES,
  SUBITO_CITY_SLUGS,
  buildRegaloCategoryUrl,
  getCityBySubitoSlug,
  parseRegaloCategoryPath,
  type SubitoCitySlug as SubitoRegaloCity,
  type SubitoRegionSlug as SubitoRegaloRegion,
} from '@/lib/geo/italian-cities';

import {
  buildRegaloCategoryUrl,
  getCityBySubitoSlug,
  parseRegaloCategoryPath,
  type SubitoCitySlug,
} from '@/lib/geo/italian-cities';

/** @deprecated Use REGALO_CATEGORY_PATH_REGEX from italian-cities — kept for legacy imports. */
export const REGALO_CATEGORY_URL_REGEX =
  /^\/annunci-([^/]+)\/regalo\/([^/]+)\/([^/]+)\/\3\/?$/i;

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

export function dedupeUrls(urls: string[]): string[] {
  return [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
}

/** Merge freshly generated regalo URLs with non-regalo manual lines (D-05). */
export function mergeGeneratedRegaloUrls(generated: string[], existingText: string): string[] {
  const manualLines = existingText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && parseRegaloCategoryUrl(line) === null);

  return dedupeUrls([...generated, ...manualLines]);
}

export function generateRegaloUrls(
  cities: readonly SubitoCitySlug[],
  slugs: readonly string[],
): string[] {
  const urls: string[] = [];
  for (const city of cities) {
    const entry = getCityBySubitoSlug(city);
    if (!entry) continue;
    for (const slug of slugs) {
      urls.push(buildRegaloCategoryUrl(entry.region, slug, city));
    }
  }
  return urls;
}
