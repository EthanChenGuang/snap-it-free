# Quick Task 260803-whr: fix Subito geo/zone pipeline so scraped free items surface in Elenco - Context

**Gathered:** 2026-08-03
**Status:** Ready for planning

<domain>
## Task Boundary

The Elenco (`/list`) page shows no scraped items. Narrow the Subito crawl target from
Veneto-wide to Venice-only, and repair coordinate/zone resolution so a successful scrape
run yields user-visible listings instead of rows silently filtered out by the
`listings_public` view.

Out of scope: adding a second scraping source (Facebook Marketplace), deploying/scheduling
the worker, changing the 48h expiry policy, UI changes.
</domain>

<investigation_findings>
## Diagnosis (verified against live Supabase project `wnerhajyjjmrtsdmdpzu`)

**Symptom:** `/list` renders no scraped listings. Only 2 rows are visible in
`listings_public`, both `ugc` E2E test posts ("E2E second 1785585495989",
"E2E second 1785585616635", zone `centro_storico`).

**Cause 1 — feed is stale.** Last `scrape_runs` row is `2026-07-28 16:32 UTC`
(status `success`, 90 found, 26 inserted). `CRON_ENABLED=false` in `scraper/.env`;
the worker only runs one-shot manually and is not deployed.

**Cause 2 — 48h auto-expiry emptied it.** All 110 `source='subito'` rows are now
`status='expired'`; newest `expires_at` was `2026-07-30 20:45 UTC`. The
`listings_public` view requires `expires_at > now()`.

**Cause 3 (the real bug) — geo/zone resolution fails at ~99%.**
Of 110 Subito rows ever ingested, **109 have `lat`/`lng` NULL and therefore `zone` NULL**.
`listings_public` requires `zone IS NOT NULL`, and `getActiveListings()` in
`lib/listings/queries.ts` filters `.not('zone', 'is', null)` again. So the last
successful run's 26 inserts produced exactly **one** user-visible listing.

Contributing factors to Cause 3, in `scraper/src/subito/`:

1. `categories.ts` targets `/annunci-veneto/regalo/{cat}/` — the whole Veneto region.
   Most results are in Padova / Verona / Treviso / Vicenza and are legitimately outside
   Venice, so they can never resolve to one of the three Venice zones. Scraping them is
   wasted budget and drags the visible-yield ratio to near zero.
2. `extract.ts` `parseCoordsFromHtml` only matches a `"latitude"` / `"lat"` JSON key in the
   raw detail HTML and hard-rejects anything outside the Venice bbox
   (45.0–45.7 lat, 12.1–12.6 lng) by returning null.
3. The municipality-centroid fallback in `lookupMunicipalityCentroid` substring-matches
   against only 7 hardcoded names (`geo/municipality-centroids.json`: Venezia, Venice,
   Mestre, Marghera, Lido, Murano, Giudecca). It is fed `extracted.locationText`, which
   comes from `span[class*="caption"]` / `[class*="location"]` / `[data-testid*="location"]`
   — selectors that appear not to be matching on current Subito detail pages, since the
   fallback almost never fired.

Note: `selector_hit_rate` was 1.000 on the successful runs because the hit-rate
calculation in `extractFromDetailPage` counts only `external_id, title, photo, url,
postedText, description` — it does **not** count location/coords. So the geo failure is
invisible to the existing scrape validation gate.
</investigation_findings>

<decisions>
## Implementation Decisions

### Scope of fix (user-selected)
- Fix the geo/zone pipeline **and** narrow Subito URLs to Venice, then re-run the scraper.
- Chosen over "just re-run" and over "scope a new source" — the yield bug is the blocker,
  not the source coverage.

### Claude's Discretion
- Exact Venice-scoped Subito URL form (province/city path vs. Veneto path plus a location
  query parameter) — verify against live Subito before committing to it.
- Whether to widen the location-text selectors, add a `__NEXT_DATA__` / JSON-LD coordinate
  path, expand the centroid table, or some combination.
- Whether to add location/coords to the `selector_hit_rate` denominator so future geo
  regressions trip the validation gate.
- Whether to purge the 110 expired Subito rows and 2 E2E test UGC posts as part of this task.
</decisions>

<specifics>
## Specific Ideas

- Any Venice-scoped URL change must keep `categories.test.ts` meaningful — it currently
  asserts every URL matches `/\/annunci-veneto\/regalo\//`, which will need updating.
- `resolveCoords` and `parseItalianPostedAt` are already exported and unit-tested; extend
  those tests rather than writing new harnesses.
- Verify the fix by running the scraper for real and confirming
  `select count(*) from listings_public where source='subito'` is materially greater than 1.
</specifics>

<canonical_refs>
## Canonical References

- `docs/legal/subito-scraping-note.md` — ToS/robots.txt posture for Subito scraping
- `scraper/src/subito/SPIKE-NOTES.md` — original selector spike, records ~31-32 articles
  per Veneto regalo category
- `supabase/migrations/002_listings_schema.sql` — `listings_public` view contract
  (`status='active' AND expires_at > now() AND zone IS NOT NULL`)
- `.planning/REQUIREMENTS.md` — SCRP-03 (zone tags via point-in-polygon at ingestion)
</canonical_refs>
