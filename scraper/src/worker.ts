import { supabaseAdmin } from './config.js';
import { contentHash } from './shared/dedupe.js';
import { persistListing } from './shared/persist.js';
import { CanonicalListingSchema } from './shared/schema.js';
import { runSubitoCrawler } from './subito/crawler.js';
import { SUBITO_CATEGORY_URLS } from './subito/categories.js';
import type { RawListing } from './subito/extract.js';

function toCanonicalListing(raw: RawListing) {
  const postedAt = new Date(raw.posted_at);
  const expiresAt = new Date(postedAt.getTime() + 48 * 60 * 60 * 1000);

  const candidate = {
    source: 'subito' as const,
    external_id: raw.external_id,
    title: raw.title,
    photo_url: raw.photo_url,
    external_url: raw.external_url,
    lat: raw.lat,
    lng: raw.lng,
    zone: null,
    status: 'active' as const,
    posted_at: postedAt,
    expires_at: expiresAt,
    content_hash: '',
    raw_payload: {
      description: raw.description,
    },
  };

  candidate.content_hash = contentHash(candidate);
  return CanonicalListingSchema.parse(candidate);
}

async function main() {
  const tracerUrl = SUBITO_CATEGORY_URLS[0];
  console.log(`Starting tracer crawl: ${tracerUrl}`);

  const { rawListings, selectorHitRate } = await runSubitoCrawler([tracerUrl]);
  console.log(`Extracted ${rawListings.length} listing(s); selector hit rate: ${selectorHitRate.toFixed(2)}`);

  if (rawListings.length === 0) {
    console.error('No listings extracted — check SPIKE-NOTES selectors or anti-bot block');
    process.exit(1);
  }

  for (const raw of rawListings) {
    const listing = toCanonicalListing(raw);
    const result = await persistListing(supabaseAdmin, listing);
    console.log(`${result}: ${listing.external_id} — ${listing.title.slice(0, 60)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
