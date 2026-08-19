import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { normalizeSubitoPhotoUrl } from '@/lib/listings/subito-photo-url';

const FETCH_TIMEOUT_MS = 20_000;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const BLOCK_SNIPPET_RE = /access denied|bot detected|akamai|please verify you are a human/i;

export type RescueRawListing = {
  external_id: string;
  title: string;
  photo_url: string;
  external_url: string;
  lat: number | null;
  lng: number | null;
  posted_at: string;
  description?: string;
  price?: string;
  image_urls?: string[];
  source_category_url?: string;
};

type SubitoAdItem = {
  subject?: string;
  date?: string;
  features?: Record<string, { values?: Array<{ key?: string; value?: string }> }>;
  images?: Array<{ cdnBaseUrl?: string }>;
  urls?: { default?: string };
  geo?: {
    city?: { value?: string; shortName?: string };
    town?: { value?: string };
  };
};

type MunicipalityCentroid = { name: string; lat: number; lng: number };

let municipalityCentroids: MunicipalityCentroid[] | null = null;

function loadMunicipalityCentroids(): MunicipalityCentroid[] {
  if (!municipalityCentroids) {
    const path = join(process.cwd(), 'scraper/src/geo/municipality-centroids.json');
    municipalityCentroids = JSON.parse(readFileSync(path, 'utf-8')) as MunicipalityCentroid[];
  }
  return municipalityCentroids;
}

function lookupMunicipalityCentroid(
  locationText: string,
): { lat: number; lng: number } | null {
  if (!locationText) return null;
  const normalized = locationText.toLowerCase();
  for (const entry of loadMunicipalityCentroids()) {
    if (normalized.includes(entry.name.toLowerCase())) {
      return { lat: entry.lat, lng: entry.lng };
    }
  }
  return null;
}

function parseExternalId(url: string): string | null {
  const match = url.match(/-(\d+)\.htm(?:\?|$)/);
  return match?.[1] ?? null;
}

function extractNextDataJson(html: string): unknown {
  const match = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]?.trim()) {
    throw new Error('Missing __NEXT_DATA__ on Subito page');
  }
  return JSON.parse(match[1]) as unknown;
}

function extractPrice(features: SubitoAdItem['features']): string {
  const values = features?.['/price']?.values;
  if (!values?.length) return '';
  const first = values[0];
  return String(first.value ?? first.key ?? '');
}

function municipalityFromGeo(geo: SubitoAdItem['geo']): string {
  const city = geo?.city?.value ?? '';
  const province = geo?.city?.shortName ?? '';
  const town = geo?.town?.value ?? '';
  if (city && province) return `${city} (${province})`;
  return town || city;
}

function parseSubitoPostedAt(dateStr: string): string {
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) return dateStr;
  return new Date(parsed).toISOString();
}

function mapAdItem(item: SubitoAdItem, sourceCategoryUrl: string): RescueRawListing | null {
  const external_url = item.urls?.default ?? '';
  const external_id = parseExternalId(external_url);
  const title = item.subject?.trim() ?? '';
  const image_urls = (item.images ?? [])
    .map((img) => img.cdnBaseUrl)
    .filter((url): url is string => Boolean(url))
    .map(normalizeSubitoPhotoUrl);
  const photo_url = image_urls[0] ?? '';
  const posted_at = item.date ? parseSubitoPostedAt(item.date) : '';
  let price = extractPrice(item.features);
  if (!price && /\/regalo\//i.test(sourceCategoryUrl)) {
    price = '0 €';
  }

  if (!external_id || !title || !photo_url || !posted_at) {
    return null;
  }

  const municipalityText = municipalityFromGeo(item.geo);
  const centroid = lookupMunicipalityCentroid(municipalityText);

  return {
    external_id,
    title: title.slice(0, 500),
    photo_url,
    external_url,
    lat: centroid?.lat ?? null,
    lng: centroid?.lng ?? null,
    posted_at,
    price,
    image_urls,
    source_category_url: sourceCategoryUrl || undefined,
  };
}

function locationHintsFromUrl(externalUrl: string): string {
  try {
    const slug = new URL(externalUrl).pathname.split('/').pop() ?? '';
    return slug
      .replace(/-\d+\.htm$/i, '')
      .replace(/-/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

function parseMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function parseDetailHtmlFallback(
  html: string,
  externalUrl: string,
  externalId: string,
  postedAtFallback: string,
  sourceCategoryUrl: string,
): RescueRawListing | null {
  const fromNext = (() => {
    try {
      return parseListingFromHtml(html, externalId, sourceCategoryUrl);
    } catch {
      return null;
    }
  })();
  if (fromNext) {
    return fromNext;
  }

  const ogImage = parseMetaContent(html, 'og:image');
  const ogTitle = parseMetaContent(html, 'og:title');
  const title =
    ogTitle?.replace(/\s*[|\-–—].*subito.*$/i, '').trim() ||
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ||
    null;
  const photo_url = ogImage ? normalizeSubitoPhotoUrl(ogImage) : null;

  if (!title || !photo_url) {
    return null;
  }

  const locationHint = locationHintsFromUrl(externalUrl);
  const centroid = lookupMunicipalityCentroid(locationHint);

  return {
    external_id: externalId,
    title: title.slice(0, 500),
    photo_url,
    external_url: externalUrl,
    lat: centroid?.lat ?? null,
    lng: centroid?.lng ?? null,
    posted_at: postedAtFallback,
    source_category_url: sourceCategoryUrl || undefined,
  };
}

function findAdByExternalId(root: unknown, externalId: string): SubitoAdItem | null {
  if (root == null || typeof root !== 'object') {
    return null;
  }

  if (Array.isArray(root)) {
    for (const item of root) {
      const hit = findAdByExternalId(item, externalId);
      if (hit) return hit;
    }
    return null;
  }

  const record = root as Record<string, unknown>;
  const urls = record.urls;
  if (urls && typeof urls === 'object' && 'default' in urls) {
    const url = (urls as { default?: string }).default ?? '';
    if (url.includes(`-${externalId}.htm`)) {
      return record as SubitoAdItem;
    }
  }

  for (const value of Object.values(record)) {
    const hit = findAdByExternalId(value, externalId);
    if (hit) return hit;
  }

  return null;
}

export async function fetchSubitoHtml(url: string, proxyUrl?: string | null): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        'User-Agent': USER_AGENT,
      },
      // Node fetch supports agent for proxy routing
      agent,
    } as RequestInit);

    if (!response.ok) {
      throw new Error(`Subito HTTP ${response.status}`);
    }

    const html = await response.text();
    if (BLOCK_SNIPPET_RE.test(html.slice(0, 8192))) {
      throw new Error('Subito blocked the request — configure proxy in settings');
    }

    return html;
  } finally {
    clearTimeout(timer);
  }
}

export function parseListingFromHtml(
  html: string,
  externalId: string,
  sourceCategoryUrl: string,
): RescueRawListing | null {
  const root = extractNextDataJson(html);
  const ad = findAdByExternalId(root, externalId);
  if (!ad) {
    return null;
  }
  return mapAdItem(ad, sourceCategoryUrl);
}

export async function fetchRescueListing(options: {
  externalId: string;
  externalUrl: string;
  categoryUrls: string[];
  proxyUrl?: string | null;
  postedAtFallback: string;
}): Promise<RescueRawListing> {
  const { externalId, externalUrl, categoryUrls, proxyUrl, postedAtFallback } = options;
  let lastError: Error | null = null;

  try {
    const detailHtml = await fetchSubitoHtml(externalUrl, proxyUrl);
    const fromDetail = parseDetailHtmlFallback(
      detailHtml,
      externalUrl,
      externalId,
      postedAtFallback,
      '',
    );
    if (fromDetail) {
      return fromDetail;
    }
    lastError = new Error('Listing not found in detail page payload');
  } catch (error) {
    lastError = error instanceof Error ? error : new Error('Detail fetch failed');
  }

  for (const categoryUrl of categoryUrls) {
    try {
      const html = await fetchSubitoHtml(categoryUrl, proxyUrl);
      const listing = parseDetailHtmlFallback(
        html,
        externalUrl,
        externalId,
        postedAtFallback,
        categoryUrl,
      );
      if (listing) {
        return { ...listing, source_category_url: categoryUrl };
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Category fetch failed');
    }
  }

  if (lastError?.message.includes('blocked') || lastError?.message.includes('Access Denied')) {
    throw new Error('Subito 拦截了请求，请在系统设置中配置代理（与 scraper 相同）');
  }

  if (lastError?.message.includes('HTTP 404')) {
    throw new Error('Subito 上该 listing 已下架或链接失效，将尝试从快照恢复');
  }

  throw new Error('无法从 Subito 重新抓取该 listing，将尝试从快照恢复');
}
