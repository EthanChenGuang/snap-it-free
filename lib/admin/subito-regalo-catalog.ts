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
  { slug: 'usato', labelIt: 'Tutte le categorie' },
] as const;

export type SubitoRegaloSlug = (typeof SUBITO_REGALO_CATALOG)[number]['slug'];
export type SubitoRegaloCity = 'venezia' | 'padova';
export type SubitoRegaloRegion = 'veneto';

/** Canonical Veneto regalo path regex — must stay in sync with scraper/src/subito/url-context.ts (D-03). */
export const REGALO_CATEGORY_URL_REGEX =
  /^\/annunci-veneto\/regalo\/[^/]+\/(venezia|padova)\/(venezia|padova)\/?$/i;

export function buildRegaloCategoryUrl(
  region: SubitoRegaloRegion,
  slug: string,
  city: SubitoRegaloCity,
): string {
  return `https://www.subito.it/annunci-${region}/regalo/${slug}/${city}/${city}/`;
}

export function parseRegaloCategoryUrl(url: string): {
  region: string;
  city: string;
  categorySlug: string;
} | null {
  try {
    const { pathname } = new URL(url);
    const m = pathname.match(REGALO_CATEGORY_URL_REGEX);
    if (!m) return null;
    const parts = pathname.split('/').filter(Boolean);
    // /annunci-veneto/regalo/{slug}/{city}/{city}
    const region = parts[0]?.replace(/^annunci-/i, '').toLowerCase() ?? '';
    const categorySlug = parts[2] ?? '';
    const city = (parts[3] ?? '').toLowerCase();
    return { region, city, categorySlug };
  } catch {
    return null;
  }
}

export function dedupeUrls(urls: string[]): string[] {
  return [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
}

export function generateRegaloUrls(
  cities: readonly SubitoRegaloCity[],
  slugs: readonly string[],
  region: SubitoRegaloRegion = 'veneto',
): string[] {
  const urls: string[] = [];
  for (const city of cities) {
    for (const slug of slugs) {
      urls.push(buildRegaloCategoryUrl(region, slug, city));
    }
  }
  return urls;
}
