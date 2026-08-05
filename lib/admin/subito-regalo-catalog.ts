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

export function buildRegaloCategoryUrl(
  region: SubitoRegaloRegion,
  slug: string,
  city: SubitoRegaloCity,
): string {
  return `https://www.subito.it/annunci-${region}/regalo/${slug}/${city}/${city}/`;
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
