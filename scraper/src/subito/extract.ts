import type { Page } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type RawListing = {
  external_id: string;
  title: string;
  photo_url: string;
  external_url: string;
  lat: number | null;
  lng: number | null;
  posted_at: string;
  description?: string;
};

export type SelectorHitRate = { hits: number; total: number };

type MunicipalityCentroid = { name: string; lat: number; lng: number };

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

function parseCoordsFromHtml(html: string): { lat: number | null; lng: number | null } {
  const latMatch = html.match(/"latitude"\s*:\s*([\d.]+)/) ?? html.match(/"lat"\s*:\s*([\d.]+)/);
  const lngMatch = html.match(/"longitude"\s*:\s*([\d.]+)/) ?? html.match(/"lng"\s*:\s*([\d.]+)/);

  if (!latMatch || !lngMatch) {
    return { lat: null, lng: null };
  }

  const lat = Number.parseFloat(latMatch[1]);
  const lng = Number.parseFloat(lngMatch[1]);

  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < VENICE_LAT_MIN ||
    lat > VENICE_LAT_MAX ||
    lng < VENICE_LNG_MIN ||
    lng > VENICE_LNG_MAX
  ) {
    return { lat: null, lng: null };
  }

  return { lat, lng };
}

function lookupMunicipalityCentroid(locationText: string): { lat: number; lng: number } | null {
  const normalized = locationText.toLowerCase();
  for (const entry of MUNICIPALITY_CENTROIDS) {
    if (normalized.includes(entry.name.toLowerCase())) {
      return { lat: entry.lat, lng: entry.lng };
    }
  }
  return null;
}

export function resolveCoords(
  html: string,
  municipalityText: string,
): { lat: number | null; lng: number | null } {
  const fromHtml = parseCoordsFromHtml(html);
  if (fromHtml.lat != null && fromHtml.lng != null) {
    return fromHtml;
  }

  const centroid = lookupMunicipalityCentroid(municipalityText);
  if (centroid) {
    return centroid;
  }

  return { lat: null, lng: null };
}

async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.locator('#didomi-notice-agree-button, button:has-text("Accetta")');
  if ((await accept.count()) > 0) {
    await accept.first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

async function resolveDetailUrls(page: Page): Promise<string[]> {
  const onCategory = page.url().includes('/annunci-veneto/regalo/');
  if (!onCategory) {
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

  const detailUrls = [...new Set(hrefs.map((href) => (href.startsWith('http') ? href : `https://www.subito.it${href}`)))];
  return detailUrls;
}

async function extractFromDetailPage(page: Page): Promise<{
  listing: RawListing | null;
  hitRate: SelectorHitRate;
}> {
  const html = await page.content();
  const external_url = page.url();
  const external_id = parseExternalId(external_url);

  const extracted = await page.evaluate(() => {
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

    const locationText =
      document.querySelector('span[class*="caption"]')?.textContent?.trim() ??
      document.querySelector('[class*="location"]')?.textContent?.trim() ??
      document.querySelector('[data-testid*="location"]')?.textContent?.trim() ??
      '';

    return { title, photo, postedText, description, locationText };
  });

  const { lat, lng } = resolveCoords(html, extracted.locationText);
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
    },
    hitRate: { hits, total: 6 },
  };
}

export async function extractListingsFromPage(page: Page): Promise<{
  listings: RawListing[];
  hitRate: SelectorHitRate;
}> {
  await dismissCookieBanner(page);

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

    const { listing, hitRate } = await extractFromDetailPage(page);
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
