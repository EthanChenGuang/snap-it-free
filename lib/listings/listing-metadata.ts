import type { Metadata } from 'next';
import type { ListingRow } from './types';

const DESCRIPTION_MAX = 200;

/** Canonical site origin for absolute OG URLs (APP_URL, else Vercel production host). */
export function getSiteUrl(): URL | undefined {
  const raw =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);
  if (!raw) return undefined;
  try {
    return new URL(raw);
  } catch {
    return undefined;
  }
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/**
 * Public share-preview metadata for a listing (D-19 #13). Built only from the
 * publicly readable row so OG previews never require auth.
 */
export function buildListingMetadata(
  listing: ListingRow,
  site: { name: string; description: string },
): Metadata {
  const title = listing.title.trim() || site.name;
  const place = listing.city?.trim();
  const body = listing.description?.trim();
  const description = truncate(
    body || (place ? `${site.description} · ${place}` : site.description),
    DESCRIPTION_MAX,
  );
  const images = [listing.photo_urls?.[0], listing.photo_url]
    .filter((url): url is string => Boolean(url && /^https?:\/\//.test(url)))
    .slice(0, 1);
  const path = `/listing/${listing.id}`;

  return {
    title: `${title} · ${site.name}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: site.name,
      title,
      description,
      url: path,
      images: images.map((url) => ({ url, alt: title })),
    },
    twitter: {
      card: images.length > 0 ? 'summary_large_image' : 'summary',
      title,
      description,
      images,
    },
  };
}
