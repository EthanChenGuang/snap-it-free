import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import { resolveSubitoProxyUrl } from '@/lib/admin/proxy-url';
import { translateListingFields } from '@/lib/admin/translate';
import { checkAndIncrementUsage } from '@/lib/admin/translation-cap';
import { recordTranslationSuccess } from '@/lib/admin/translation-usage-log';
import { REGALO_CATEGORY_URL_REGEX } from '@/lib/admin/subito-regalo-catalog';
import {
  fetchRescueListing,
  type RescueRawListing,
} from '@/lib/admin/subito-rescue-fetch';
import { RESCUE_PLACEHOLDER_PHOTO } from '@/lib/admin/rescue-placeholder';
import { normalizeSubitoPhotoUrl } from '@/lib/listings/subito-photo-url';
import { computeScrapedListingExpiresAt } from '@/lib/listings/scraped-listing-ttl';

type VeniceZone = 'centro_storico' | 'mestre_marghera' | 'lido_murano';

type ZonePolygon = {
  id: VeniceZone;
  polygon: Polygon;
};

type RescueRejectRow = {
  id: string;
  scrape_run_id: string | null;
  external_id: string | null;
  reject_reason: string;
  raw_snippet: Record<string, unknown>;
  scrape_runs:
    | { source: string; target_urls_snapshot: string[] | null }
    | { source: string; target_urls_snapshot: string[] | null }[]
    | null;
};

function resolveRejectRun(row: RescueRejectRow): {
  source: string;
  target_urls_snapshot: string[] | null;
} | null {
  const run = row.scrape_runs;
  if (!run) return null;
  if (Array.isArray(run)) return run[0] ?? null;
  return run;
}

export type RescueRejectResult =
  | { ok: true; listingId: string; externalId: string; offlineRescue: boolean }
  | { ok: false; error: string };

let cachedZones: ZonePolygon[] | null = null;

function loadZonePolygons(): ZonePolygon[] {
  if (cachedZones) return cachedZones;
  const geoDir = join(process.cwd(), 'scraper/src/geo');
  const readCollection = (filename: string, zoneId: VeniceZone): ZonePolygon => {
    const collection = JSON.parse(
      readFileSync(join(geoDir, filename), 'utf-8'),
    ) as FeatureCollection;
    const feature = collection.features.find(
      (f) => f.geometry.type === 'Polygon' && f.properties?.zone === zoneId,
    );
    if (!feature || feature.geometry.type !== 'Polygon') {
      throw new Error(`Missing polygon for zone ${zoneId}`);
    }
    return { id: zoneId, polygon: feature.geometry };
  };
  cachedZones = [
    readCollection('centro-storico.geojson', 'centro_storico'),
    readCollection('mestre-marghera.geojson', 'mestre_marghera'),
    readCollection('lido-murano.geojson', 'lido_murano'),
  ];
  return cachedZones;
}

function tagZone(lat: number, lng: number): VeniceZone | null {
  const pt: Feature<Point> = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {},
  };
  for (const zone of loadZonePolygons()) {
    if (booleanPointInPolygon(pt, zone.polygon)) {
      return zone.id;
    }
  }
  return null;
}

function computeExpiresAt(postedAt: Date, now = new Date()): Date {
  return computeScrapedListingExpiresAt(postedAt, now);
}

function contentHash(listing: {
  title: string;
  photo_url: string;
  lat: number | null;
  lng: number | null;
}): string {
  const payload = `${listing.title}|${listing.photo_url}|${listing.lat}|${listing.lng}`;
  return createHash('sha256').update(payload).digest('hex');
}

function crawlContentHash(listing: RescueRawListing): string {
  const images =
    listing.image_urls && listing.image_urls.length > 0
      ? listing.image_urls.join(',')
      : listing.photo_url;
  const payload = `${listing.title}|${listing.price ?? ''}|${images}|${listing.posted_at}`;
  return createHash('sha256').update(payload).digest('hex');
}

function extractCategoryFromSubitoUrl(externalUrl: string): string | null {
  try {
    const { pathname } = new URL(externalUrl);
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 2 && segments[1]?.includes('.htm')) {
      return segments[0] ?? null;
    }
    const regaloMatch = pathname.match(/\/regalo\/([^/]+)/i);
    return regaloMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

function parseRegaloCategoryUrl(url: string): {
  region: string;
  city: string;
  categorySlug: string;
} | null {
  try {
    const { pathname } = new URL(url);
    if (!REGALO_CATEGORY_URL_REGEX.test(pathname)) return null;
    const parts = pathname.split('/').filter(Boolean);
    const region = parts[0]?.replace(/^annunci-/i, '').toLowerCase() ?? '';
    const categorySlug = parts[2] ?? '';
    const city = (parts[3] ?? '').toLowerCase();
    return { region, city, categorySlug };
  } catch {
    return null;
  }
}

function resolveExternalUrl(
  externalId: string,
  rawSnippet: Record<string, unknown>,
): string | null {
  const fromSnippet = rawSnippet.external_url;
  if (typeof fromSnippet === 'string' && fromSnippet.includes('.htm')) {
    return fromSnippet;
  }
  return null;
}

function snippetDescription(rawSnippet: Record<string, unknown>): string | undefined {
  return typeof rawSnippet.description === 'string' ? rawSnippet.description : undefined;
}

function listingFromStoredSnippet(
  externalId: string,
  rawSnippet: Record<string, unknown>,
  fallbackPostedAt: string,
  options?: { allowMissingPhoto?: boolean },
): RescueRawListing | null {
  const title = typeof rawSnippet.title === 'string' ? rawSnippet.title.trim() : '';
  const external_url =
    typeof rawSnippet.external_url === 'string' ? rawSnippet.external_url : null;
  const photo_url =
    typeof rawSnippet.photo_url === 'string' ? rawSnippet.photo_url : null;
  const posted_at =
    typeof rawSnippet.posted_at === 'string' ? rawSnippet.posted_at : fallbackPostedAt;
  const lat = typeof rawSnippet.lat === 'number' ? rawSnippet.lat : null;
  const lng = typeof rawSnippet.lng === 'number' ? rawSnippet.lng : null;
  const price = typeof rawSnippet.price === 'string' ? rawSnippet.price : undefined;
  const source_category_url =
    typeof rawSnippet.source_category_url === 'string'
      ? rawSnippet.source_category_url
      : undefined;
  const image_urls = Array.isArray(rawSnippet.image_urls)
    ? rawSnippet.image_urls.filter((item): item is string => typeof item === 'string')
    : undefined;

  if (!title || !external_url) {
    return null;
  }

  const resolvedPhoto =
    photo_url ?? (options?.allowMissingPhoto ? RESCUE_PLACEHOLDER_PHOTO : null);
  if (!resolvedPhoto) {
    return null;
  }

  return {
    external_id: externalId,
    title: title.slice(0, 500),
    photo_url: resolvedPhoto,
    external_url,
    lat,
    lng,
    posted_at,
    price,
    image_urls,
    source_category_url,
    description: snippetDescription(rawSnippet),
  };
}

async function resolveCategoryUrls(
  supabase: SupabaseClient,
  source: string,
  run: { target_urls_snapshot: string[] | null } | null,
): Promise<string[]> {
  const fromRun = run?.target_urls_snapshot?.filter(Boolean) ?? [];
  if (fromRun.length > 0) {
    return fromRun;
  }

  const { data: sourceRow } = await supabase
    .from('scraper_sources')
    .select('target_urls')
    .eq('slug', source)
    .maybeSingle();

  return ((sourceRow?.target_urls as string[] | null) ?? []).filter(Boolean);
}

function buildCanonicalListing(raw: RescueRawListing, description?: string) {
  const postedAt = new Date(raw.posted_at);
  const expiresAt = computeExpiresAt(postedAt);
  const zone =
    raw.lat != null && raw.lng != null ? tagZone(raw.lat, raw.lng) : null;
  const urlContext = raw.source_category_url
    ? parseRegaloCategoryUrl(raw.source_category_url)
    : null;

  const candidate = {
    source: 'subito' as const,
    external_id: raw.external_id,
    title: raw.title,
    photo_url: normalizeSubitoPhotoUrl(raw.photo_url),
    external_url: raw.external_url,
    lat: raw.lat,
    lng: raw.lng,
    zone,
    city: urlContext?.city ?? null,
    region: urlContext?.region ?? null,
    status: 'active' as const,
    posted_at: postedAt,
    expires_at: expiresAt,
    content_hash: '',
    crawl_content_hash: crawlContentHash(raw),
    category: extractCategoryFromSubitoUrl(raw.external_url),
    raw_payload: description ? { description } : {},
  };

  candidate.content_hash = contentHash(candidate);
  return candidate;
}

async function persistRescuedListing(
  supabase: SupabaseClient,
  listing: ReturnType<typeof buildCanonicalListing>,
): Promise<string> {
  const row = {
    source: listing.source,
    external_id: listing.external_id,
    title: listing.title,
    photo_url: listing.photo_url,
    external_url: listing.external_url,
    lat: listing.lat,
    lng: listing.lng,
    zone: listing.zone,
    city: listing.city,
    region: listing.region,
    status: listing.status,
    posted_at: listing.posted_at.toISOString(),
    expires_at: listing.expires_at.toISOString(),
    content_hash: listing.content_hash,
    crawl_content_hash: listing.crawl_content_hash,
    scraped_at: new Date().toISOString(),
    category: listing.category,
    raw_payload: listing.raw_payload,
    geom:
      listing.lat != null && listing.lng != null
        ? `SRID=4326;POINT(${listing.lng} ${listing.lat})`
        : null,
  };

  const { data, error } = await supabase
    .from('listings')
    .upsert(row, { onConflict: 'source,external_id' })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? 'Failed to persist listing');
  }

  return data.id as string;
}

async function maybeTranslateListing(
  supabase: SupabaseClient,
  listingId: string,
  listing: ReturnType<typeof buildCanonicalListing>,
): Promise<void> {
  const { data: config } = await supabase
    .from('scraper_global_config')
    .select('auto_translate, translation_provider')
    .maybeSingle();

  if (!config?.auto_translate) {
    return;
  }

  const usage = await checkAndIncrementUsage(supabase);
  if (!usage.allowed) {
    return;
  }

  const provider = (config.translation_provider as 'gemini' | 'openrouter') ?? 'gemini';
  const description =
    listing.raw_payload && typeof listing.raw_payload.description === 'string'
      ? listing.raw_payload.description
      : null;

  const result = await translateListingFields(
    {
      title: listing.title,
      description,
      category: listing.category ?? null,
    },
    provider,
    {
      geminiApiKey: process.env.GEMINI_API_KEY?.trim(),
      openRouterApiKey: process.env.OPENROUTER_API_KEY?.trim(),
      openRouterModel: process.env.OPENROUTER_FALLBACK_MODEL?.trim(),
      geminiModel: process.env.GEMINI_MODEL?.trim(),
    },
  );

  if (!result.ok) {
    return;
  }

  await supabase.from('listings').update(result.translations).eq('id', listingId);
  await recordTranslationSuccess(supabase, listingId, result, 'rescue');
}

export async function rescueRejectedListing(
  supabase: SupabaseClient,
  rejectId: string,
): Promise<RescueRejectResult> {
  const { data, error } = await supabase
    .from('scrape_rejects')
    .select(
      'id, scrape_run_id, external_id, reject_reason, raw_snippet, created_at, scrape_runs(source, target_urls_snapshot)',
    )
    .eq('id', rejectId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: 'Reject record not found' };
  }

  const row = data as RescueRejectRow & { created_at?: string };
  const run = resolveRejectRun(row);
  const source = run?.source ?? 'subito';
  if (source !== 'subito') {
    return { ok: false, error: 'Single-listing rescue is only supported for Subito' };
  }

  const externalId = row.external_id ?? null;
  const externalUrl = externalId ? resolveExternalUrl(externalId, row.raw_snippet) : null;
  if (!externalId || !externalUrl) {
    return { ok: false, error: 'Missing listing ID or URL on this reject record' };
  }

  const postedAtFallback =
    typeof row.created_at === 'string' ? row.created_at : new Date().toISOString();

  const snapshotListing = listingFromStoredSnippet(
    externalId,
    row.raw_snippet,
    postedAtFallback,
    { allowMissingPhoto: true },
  );

  let rawListing: RescueRawListing;
  let offlineRescue = false;

  if (snapshotListing) {
    rawListing = snapshotListing;
    offlineRescue = snapshotListing.photo_url === RESCUE_PLACEHOLDER_PHOTO;
  } else {
    const proxyUrl = await resolveSubitoProxyUrl(supabase);
    const categoryUrls = await resolveCategoryUrls(supabase, source, run);

    try {
      rawListing = await fetchRescueListing({
        externalId,
        externalUrl,
        categoryUrls,
        proxyUrl,
        postedAtFallback,
      });
    } catch (fetchError) {
      return {
        ok: false,
        error: fetchError instanceof Error ? fetchError.message : 'Re-fetch failed',
      };
    }
  }

  const description = snippetDescription(row.raw_snippet) ?? rawListing.description;
  const listing = buildCanonicalListing(rawListing, description);

  let listingId: string;
  try {
    listingId = await persistRescuedListing(supabase, listing);
  } catch (persistError) {
    return {
      ok: false,
      error: persistError instanceof Error ? persistError.message : 'Persist failed',
    };
  }

  await maybeTranslateListing(supabase, listingId, listing);

  const { error: deleteError } = await supabase.from('scrape_rejects').delete().eq('id', rejectId);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  return { ok: true, listingId, externalId, offlineRescue };
}
