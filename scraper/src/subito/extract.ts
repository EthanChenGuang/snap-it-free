import type { Page } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRegaloCategoryUrl } from './url-context.js';
import {
  inCityBbox as inCatalogCityBbox,
  type SubitoCitySlug,
} from '../geo/italian-cities.js';

export type RawListing = {
  external_id: string;
  title: string;
  photo_url: string;
  external_url: string;
  lat: number | null;
  lng: number | null;
  posted_at: string;
  /** Source of the listing. Defaults to 'subito' for legacy callers (Phase 15-era normalize). */
  source?: 'subito' | 'vinted';
  description?: string;
  /** HTTP category JSON price field (crawl hash input). */
  price?: string;
  /** HTTP category JSON image URLs (crawl hash input). */
  image_urls?: string[];
  /** Category listing URL this listing was scraped from (D-20). */
  source_category_url?: string;
};

export type SelectorHitRate = { hits: number; total: number };

export type CoordSource =
  | 'next-data'
  | 'ld-json'
  | 'raw-html'
  | 'map-url'
  | 'centroid'
  | 'none'
  | 'out-of-bbox';

export type ResolveCoordsResult = {
  lat: number | null;
  lng: number | null;
  source: CoordSource;
  matchedName?: string;
};

type MunicipalityCentroid = { name: string; lat: number; lng: number };

// File order is significant: localities first, comune-wide aliases (Venezia/Venice) last.
// First match wins so "Mestre | Venezia (VE)" resolves to Mestre, not the comune centroid.
const MUNICIPALITY_CENTROIDS = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../geo/municipality-centroids.json'),
    'utf-8',
  ),
) as MunicipalityCentroid[];

const VENICE_LAT_MIN = 45.0;
const VENICE_LAT_MAX = 45.7;
const VENICE_LNG_MIN = 12.1;
const VENICE_LNG_MAX = 12.6;

/** @deprecated Import from italian-cities — kept for existing tests. */
export const PADOVA_LAT_MIN = 45.3;
export const PADOVA_LAT_MAX = 45.5;
export const PADOVA_LNG_MIN = 11.7;
export const PADOVA_LNG_MAX = 12.0;

export type ScrapeCity = SubitoCitySlug;

function cityFromSourceCategoryUrl(sourceCategoryUrl: string): ScrapeCity {
  const parsed = parseRegaloCategoryUrl(sourceCategoryUrl);
  if (parsed?.city && isScrapeCity(parsed.city)) return parsed.city;
  return 'venezia';
}

function isScrapeCity(value: string): value is ScrapeCity {
  return (
    value === 'venezia' ||
    value === 'padova' ||
    value === 'milano' ||
    value === 'firenze' ||
    value === 'roma' ||
    value === 'napoli' ||
    value === 'perugia' ||
    value === 'torino' ||
    value === 'prato'
  );
}

/** City-aware bounding box gate — replaces Venice-only inVeniceBbox (D-21). */
export function inCityBbox(lat: number, lng: number, city: ScrapeCity): boolean {
  return inCatalogCityBbox(lat, lng, city);
}

function inVeniceBbox(lat: number, lng: number): boolean {
  return inCityBbox(lat, lng, 'venezia');
}

const VENETO_PROVINCE_CODES = ['VE', 'PD', 'TV', 'VR', 'VI', 'RO', 'BL'] as const;
const PROVINCE_RE = new RegExp(
  `([A-ZÀ-Ý][\\p{L}'’.\\- ]{1,40}?)\\s*\\((${VENETO_PROVINCE_CODES.join('|')})\\)`,
  'u',
);

/** True for any Subito regalo category listing URL, regardless of location segment. */
export function isRegaloCategoryUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    // /annunci-{region}/regalo/{category}/[…] — not a detail .htm page
    return /\/annunci-[^/]+\/regalo\/[^/]+\/?/i.test(pathname) && !pathname.includes('.htm');
  } catch {
    return false;
  }
}

function parseExternalId(url: string): string | null {
  const match = url.match(/-(\d+)\.htm(?:\?|$)/);
  return match?.[1] ?? null;
}

export function parseItalianPostedAt(text: string, now = new Date()): Date {
  const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
  const hours = timeMatch ? Number.parseInt(timeMatch[1], 10) : 12;
  const minutes = timeMatch ? Number.parseInt(timeMatch[2], 10) : 0;

  if (/oggi/i.test(text)) {
    const d = new Date(now);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }
  if (/ieri/i.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed);
  }

  return now;
}

function walkForCoords(node: unknown, depth = 0): { lat: number; lng: number } | null {
  if (node == null || depth > 12) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = walkForCoords(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof node !== 'object') return null;

  const record = node as Record<string, unknown>;
  const keys = Object.keys(record);
  const latKey = keys.find((k) => /^(lat|latitude|latitudine)$/i.test(k));
  const lngKey = keys.find((k) => /^(lng|lon|long|longitude|longitudine)$/i.test(k));
  if (latKey && lngKey) {
    const lat = Number.parseFloat(String(record[latKey]));
    const lng = Number.parseFloat(String(record[lngKey]));
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  for (const k of keys) {
    const hit = walkForCoords(record[k], depth + 1);
    if (hit) return hit;
  }
  return null;
}

function fromNextData(html: string): { lat: number; lng: number } | null {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    return walkForCoords(JSON.parse(m[1]));
  } catch {
    return null;
  }
}

function fromLdJson(html: string): { lat: number; lng: number } | null {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    try {
      const hit = walkForCoords(JSON.parse(b[1]));
      if (hit) return hit;
    } catch {
      /* ignore malformed block */
    }
  }
  return null;
}

function fromRawHtml(html: string): { lat: number; lng: number } | null {
  const latM =
    html.match(/"?(?:latitude|latitudine)"?\s*[:=]\s*"?(-?\d+(?:\.\d+)?)"?/i) ??
    html.match(/"?lat"?\s*[:=]\s*"?(-?\d+(?:\.\d+)?)"?/i);
  const lngM =
    html.match(/"?(?:longitude|longitudine)"?\s*[:=]\s*"?(-?\d+(?:\.\d+)?)"?/i) ??
    html.match(/"?(?:lng|lon|long)"?\s*[:=]\s*"?(-?\d+(?:\.\d+)?)"?/i);
  if (!latM || !lngM) return null;
  const lat = Number.parseFloat(latM[1]);
  const lng = Number.parseFloat(lngM[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function fromMapUrl(html: string): { lat: number; lng: number } | null {
  const m =
    html.match(/maps\.google[^"'\s]*?[?&](?:q|center|ll)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i) ??
    html.match(/(?:staticmap|maps\/api)[^"'\s]*?[?&](?:center|markers)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/i);
  if (!m) return null;
  const lat = Number.parseFloat(m[1]);
  const lng = Number.parseFloat(m[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/**
 * Longest-name-first substring match so a locality beats the comune-wide name
 * (e.g. "Mestre" before "Venezia", "Lido di Venezia" before a short "Lido").
 */
export function lookupMunicipalityCentroid(
  locationText: string,
): { lat: number; lng: number; matchedName: string } | null {
  if (!locationText) return null;
  const normalized = locationText.toLowerCase();
  for (const entry of MUNICIPALITY_CENTROIDS) {
    if (normalized.includes(entry.name.toLowerCase())) {
      return { lat: entry.lat, lng: entry.lng, matchedName: entry.name };
    }
  }
  return null;
}

/**
 * Prefer locality tokens from the detail URL slug (e.g. `…-marghera-venezia-….htm`)
 * over the comune-wide location label Subito shows as "Venezia (VE)".
 */
export function locationHintsFromUrl(externalUrl: string): string {
  try {
    const path = new URL(externalUrl).pathname;
    const slug = path.split('/').pop() ?? '';
    return slug.replace(/-\d+\.htm$/i, '').replace(/-/g, ' ');
  } catch {
    return '';
  }
}

export function resolveCoords(
  html: string,
  municipalityText: string,
  externalUrl = '',
  sourceCategoryUrl = '',
): ResolveCoordsResult {
  const city = sourceCategoryUrl ? cityFromSourceCategoryUrl(sourceCategoryUrl) : 'venezia';

  const embedded: Array<{ source: CoordSource; hit: { lat: number; lng: number } | null }> = [
    { source: 'next-data', hit: fromNextData(html) },
    { source: 'ld-json', hit: fromLdJson(html) },
    { source: 'raw-html', hit: fromRawHtml(html) },
    { source: 'map-url', hit: fromMapUrl(html) },
  ];

  for (const { source, hit } of embedded) {
    if (!hit) continue;
    if (!inCityBbox(hit.lat, hit.lng, city)) {
      return { lat: null, lng: null, source: 'out-of-bbox' };
    }
    return { lat: hit.lat, lng: hit.lng, source };
  }

  // Slug locality first (Marghera/Mestre/…), then the visible location string.
  const hintText = [locationHintsFromUrl(externalUrl), municipalityText].filter(Boolean).join(' | ');
  const centroid = lookupMunicipalityCentroid(hintText);
  if (centroid) {
    if (!inCityBbox(centroid.lat, centroid.lng, city)) {
      return { lat: null, lng: null, source: 'out-of-bbox', matchedName: centroid.matchedName };
    }
    return {
      lat: centroid.lat,
      lng: centroid.lng,
      source: 'centroid',
      matchedName: centroid.matchedName,
    };
  }

  return { lat: null, lng: null, source: 'none' };
}

export async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.locator('#didomi-notice-agree-button, button:has-text("Accetta")');
  if ((await accept.count()) > 0) {
    await accept.first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

async function resolveDetailUrls(page: Page): Promise<string[]> {
  if (!isRegaloCategoryUrl(page.url())) {
    return [page.url()];
  }

  await page.waitForSelector('article a[href*=".htm"]', { timeout: 30000 }).catch(() => {});
  const hrefs = await page
    .locator('article a[href*=".htm"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute('href'))
        .filter((href): href is string => Boolean(href)),
    );

  const detailUrls = [
    ...new Set(hrefs.map((href) => (href.startsWith('http') ? href : `https://www.subito.it${href}`))),
  ];
  return detailUrls;
}

export async function extractFromDetailPage(
  page: Page,
  sourceCategoryUrl = '',
): Promise<{
  listing: RawListing | null;
  hitRate: SelectorHitRate;
}> {
  const html = await page.content();
  const external_url = page.url();
  const external_id = parseExternalId(external_url);

  const extracted = await page.evaluate((provincePatternSource: string) => {
    const title = document.querySelector('h1')?.textContent?.trim() ?? '';
    const photo =
      document.querySelector('img[src*="sbt-ads-images-pro"]')?.getAttribute('src') ??
      document.querySelector('img[src*="sbito.it/api"]')?.getAttribute('src') ??
      document.querySelector('img[src*="images.sbito"]')?.getAttribute('src') ??
      '';
    const postedText =
      document.querySelector('span[class*="insertion-date"]')?.textContent?.trim() ??
      document.querySelector('time[datetime]')?.getAttribute('datetime') ??
      document.querySelector('time')?.textContent?.trim() ??
      '';

    const descSection = [...document.querySelectorAll('h2, h3, span, div')].find(
      (el) => el.textContent?.trim() === 'Descrizione',
    );
    const descFromSection = descSection
      ? [...(descSection.parentElement?.querySelectorAll('p') ?? [])]
          .map((p) => p.textContent?.trim() ?? '')
          .find((t) => t.length > 20)
      : undefined;

    const paragraphs = [...document.querySelectorAll('p')]
      .map((p) => p.textContent?.trim() ?? '')
      .filter(
        (t) =>
          t.length > 30 &&
          !t.includes('Registrati') &&
          !t.includes('prestito') &&
          !t.includes('dialog window') &&
          !t.includes('Escape will cancel') &&
          !t.includes('Facile.it') &&
          !t.includes('TuttoSubito'),
      );

    const description = descFromSection ?? paragraphs[0] ?? '';

    // Prefer real location nodes. span[class*="caption"] is the insertion date on current Subito.
    const locationCandidates = [
      document.querySelector('[class*="location"]')?.textContent?.trim() ?? '',
      document.querySelector('[data-testid*="location"]')?.textContent?.trim() ?? '',
      document.querySelector('[class*="AdInfo"]')?.textContent?.trim() ?? '',
      document.querySelector('[class*="city"]')?.textContent?.trim() ?? '',
    ];

    const provinceRe = new RegExp(provincePatternSource, 'u');
    let locationText = locationCandidates.find((t) => t && provinceRe.test(t)) ?? '';

    if (!locationText) {
      const body = (document.body.innerText ?? '').replace(/\s+/g, ' ').slice(0, 6000);
      const bodyMatch = body.match(provinceRe);
      if (bodyMatch) {
        locationText = `${bodyMatch[1].trim()} (${bodyMatch[2]})`;
      }
    }

    return { title, photo, postedText, description, locationText };
  }, PROVINCE_RE.source);

  const { lat, lng } = resolveCoords(
    html,
    extracted.locationText,
    external_url,
    sourceCategoryUrl,
  );
  const posted_at = parseItalianPostedAt(extracted.postedText).toISOString();

  const fields = [
    external_id,
    extracted.title,
    extracted.photo,
    external_url,
    extracted.postedText,
    extracted.description,
  ];
  const hits = fields.filter((f) => Boolean(f)).length;

  if (!external_id || !extracted.title || !extracted.photo) {
    return { listing: null, hitRate: { hits, total: 6 } };
  }

  return {
    listing: {
      external_id,
      title: extracted.title.slice(0, 500),
      photo_url: extracted.photo,
      external_url,
      lat,
      lng,
      posted_at,
      description: extracted.description || undefined,
      source_category_url: sourceCategoryUrl || undefined,
    },
    hitRate: { hits, total: 6 },
  };
}

export async function extractListingsFromPage(page: Page): Promise<{
  listings: RawListing[];
  hitRate: SelectorHitRate;
}> {
  await dismissCookieBanner(page);

  const sourceCategoryUrl = isRegaloCategoryUrl(page.url()) ? page.url() : '';

  const detailUrls = await resolveDetailUrls(page);
  if (detailUrls.length === 0) {
    return { listings: [], hitRate: { hits: 0, total: 6 } };
  }

  const listings: RawListing[] = [];
  let selectorHits = 0;
  let selectorTotal = 0;

  for (const detailUrl of detailUrls) {
    if (page.url() !== detailUrl) {
      await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await dismissCookieBanner(page);
      await page.waitForTimeout(1500);
    }

    const { listing, hitRate } = await extractFromDetailPage(page, sourceCategoryUrl);
    selectorHits += hitRate.hits;
    selectorTotal += hitRate.total;
    if (listing) listings.push(listing);
  }

  return {
    listings,
    hitRate: {
      hits: selectorHits,
      total: selectorTotal > 0 ? selectorTotal : 6,
    },
  };
}
