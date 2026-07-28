import { supabaseAdmin } from './config.js';
import { normalizeRawListing } from './shared/normalize.js';
import { logReject, persistListing } from './shared/persist.js';
import { runSubitoCrawler } from './subito/crawler.js';
import { SUBITO_CATEGORY_URLS } from './subito/categories.js';

async function main() {
  const tracerUrl = SUBITO_CATEGORY_URLS[0];
  console.log(`Starting crawl: ${tracerUrl}`);

  const { rawListings, selectorHitRate } = await runSubitoCrawler([tracerUrl]);
  console.log(
    `Extracted ${rawListings.length} listing(s); selector hit rate: ${selectorHitRate.toFixed(2)}`,
  );

  if (rawListings.length === 0) {
    console.error('No listings extracted — check SPIKE-NOTES selectors or anti-bot block');
    process.exit(1);
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let rejected = 0;

  for (const raw of rawListings) {
    const result = normalizeRawListing(raw);

    if ('reject' in result) {
      await logReject(supabaseAdmin, null, raw.external_id, result.reject, {
        title: raw.title,
        description: raw.description,
        external_url: raw.external_url,
      });
      rejected += 1;
      console.log(`rejected: ${raw.external_id} — ${result.reject}`);
      continue;
    }

    const persistResult = await persistListing(supabaseAdmin, result);
    if (persistResult === 'inserted') inserted += 1;
    else if (persistResult === 'updated') updated += 1;
    else skipped += 1;

    console.log(
      `${persistResult}: ${result.external_id} — ${result.title.slice(0, 60)} (zone: ${result.zone ?? 'null'})`,
    );
  }

  console.log(
    `Done: inserted=${inserted} updated=${updated} skipped=${skipped} rejected=${rejected}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
