---
phase: quick-260803-whr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scraper/scripts/spike-subito-geo.mjs
  - scraper/scripts/check-visible-listings.mjs
  - scraper/src/subito/SPIKE-NOTES.md
  - scraper/src/subito/extract.ts
  - scraper/src/subito/extract.test.ts
  - scraper/src/subito/categories.ts
  - scraper/src/subito/categories.test.ts
  - scraper/src/geo/municipality-centroids.json
  - scraper/src/geo/mestre-marghera.geojson
  - scraper/src/geo/lido-murano.geojson
  - scraper/src/shared/zone-tag.test.ts
  - scraper/src/shared/validate-run.ts
  - scraper/src/shared/validate-run.test.ts
  - scraper/src/config.ts
  - scraper/src/worker.ts
  - lib/geo/geojson/mestre-marghera.geojson
  - lib/geo/geojson/lido-murano.geojson
autonomous: true
requirements: [SCRP-03]
user_setup: []

must_haves:
  truths:
    - "A real worker run from scraper/ leaves at least 5 source='subito' rows visible in listings_public (CONTEXT: scope-of-fix decision — measurable outcome)."
    - "Every entry in municipality-centroids.json resolves to a non-null Venice zone through tagZone."
    - "SUBITO_CATEGORY_URLS point at Venice-scoped Subito paths whose live article counts were observed, not guessed."
    - "A run where fewer than half the extracted listings resolve coordinates fails validation with a geo-specific failure reason instead of reporting success."
    - "The Elenco page (/list) renders scraped Subito cards after the run."
  artifacts:
    - scraper/scripts/spike-subito-geo.mjs
    - scraper/scripts/check-visible-listings.mjs
    - scraper/src/subito/extract.test.ts
    - "New dated recon section in scraper/src/subito/SPIKE-NOTES.md"
  key_links:
    - "extract.resolveCoords -> normalize.tagZone -> listings.zone -> listings_public (zone IS NOT NULL) -> getActiveListings()"
    - "scraper/src/geo/*.geojson must stay byte-identical to lib/geo/geojson/*.geojson so UGC and scraper tag the same zones"
    - "worker geo-resolution rate -> validateBatch -> scrape_runs.failure_reason + notifyOperator"
---

<objective>
Make scraped Subito free items actually visible in Elenco by repairing coordinate/zone
resolution and narrowing the crawl from Veneto-wide to Venice.

Purpose: 109 of 110 ingested Subito rows have NULL lat/lng and therefore NULL zone, and
`listings_public` filters `zone IS NOT NULL`, so a "successful" 26-insert run produced exactly
one user-visible listing. The diagnosis in CONTEXT.md is verified against the live database —
do not re-derive it.

Output: Venice-scoped category URLs confirmed against the live site, a widened
coordinate/location extraction path with unit tests, a centroid table where every entry
provably lands in a zone, a geo-resolution validation gate so this failure can never pass
silently again, and a real scrape run whose visible-listing count is measured, not assumed.

Out of scope (CONTEXT boundary): UI changes, a second scraping source, deploying/scheduling
the worker, changing the 48h expiry policy. No files under `app/`, `components/`, or
`*.css` are touched, so the Stitch UI design authority does not apply to this plan.
</objective>

<execution_context>
@/home/guang/Projects/Experiments/.cursor/gsd-core/workflows/execute-plan.md
@/home/guang/Projects/Experiments/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/260803-whr-fix-subito-geo-zone-pipeline-so-scraped-/260803-whr-CONTEXT.md
@.planning/STATE.md
@scraper/src/subito/SPIKE-NOTES.md
@scraper/src/subito/extract.ts
@scraper/src/subito/categories.ts
@scraper/src/shared/zone-tag.ts
@scraper/src/shared/normalize.ts
@scraper/src/shared/persist.ts
@scraper/src/worker.ts
@scraper/scripts/spike-subito-coords.mjs
@docs/legal/subito-scraping-note.md
</context>

<verified_facts>
Facts established while planning — treat as given, do not re-verify from scratch:

1. Zone polygons are three crude rectangles (`scraper/src/geo/*.geojson`):
   centro_storico lng 12.320–12.360 / lat 45.420–45.450;
   lido_murano lng 12.350–12.420 / lat 45.390–45.440;
   mestre_marghera lng 12.200–12.280 / lat 45.460–45.500.
2. Two existing centroid entries fall OUTSIDE their own zone rectangle, so even when the
   fallback fires they still yield a null zone:
   Marghera 45.459 (rectangle starts at 45.460) and Murano 45.458 (rectangle ends at 45.440).
3. `scraper/src/geo/*.geojson` and `lib/geo/geojson/*.geojson` are currently byte-identical
   and are read by two separate taggers (scraper ingestion and UGC posting). They must stay
   identical.
4. `contentHash` = `title|photo_url|lat|lng`. A previously-ingested listing that now resolves
   coordinates produces a different hash, so `persistListing` takes the update path and
   rewrites `zone`, `status='active'`, and `expires_at`. Expired rows revive themselves —
   no destructive purge is needed (CONTEXT left the purge to discretion; the decision here
   is NOT to purge, avoiding irreversible DB writes for no yield gain).
5. `resolveDetailUrls` in `extract.ts` decides "category page vs detail page" with a
   hardcoded `/annunci-veneto/regalo/` substring check. Narrowing the URLs without fixing
   this check makes every category page get treated as a detail page.
6. `selector_hit_rate` counts only external_id/title/photo/url/postedText/description, which
   is why 1% geo yield still scored 1.000.
7. Root `vitest.config.ts` includes only `lib/**` and `messages/**`; the scraper suite runs
   from `scraper/` with its own `vitest.config.ts` and its own `.env`.
</verified_facts>

<tasks>

<task type="tracer">
  <name>Task 1: Prove one Venice listing end-to-end — live URL form + real coordinate source</name>
  <precondition>This machine can reach www.subito.it and Playwright Chromium is installed for the scraper workspace (install it if the launch fails).</precondition>
  <files>scraper/scripts/spike-subito-geo.mjs, scraper/src/subito/SPIKE-NOTES.md</files>
  <action>
    Adapt `scraper/scripts/spike-subito-coords.mjs` and `spike-subito-detail-v2.mjs` into one
    recon script that answers the two questions the CONTEXT left to discretion, against the
    live site, before any production selector is committed.

    Part A — Venice-scoped URL form. Probe candidate forms for the three existing regalo
    categories (province path `annunci-venezia`, city-narrowed variants, and a Veneto path
    plus a location query parameter). For each candidate print the final URL after redirects,
    the HTTP status, and the count of `article a[href*=".htm"]` cards found. Dismiss the
    Didomi banner exactly as `extract.ts` does. Pick the narrowest form that still returns a
    usable card count.

    Part B — where location and coordinates actually live. For the first 6 detail pages of
    the winning form, dump every candidate: `__NEXT_DATA__` script JSON walked for
    latitude/longitude-ish keys, `application/ld+json` blocks with a `geo` object, raw-HTML
    regex hits for quoted or unquoted latitude/longitude, Google-maps embed or static-map
    URLs carrying `q=`/`center=` pairs, and candidate location strings from breadcrumbs, any
    element whose class contains AdInfo or city, plus a whole-body text scan for a
    municipality followed by a bracketed Veneto province code. For each page print one line
    containing the resolved lat/lng, which source produced it, the location string, and
    `zone=<result>` computed by importing `loadZonePolygons`/`tagZone` from
    `src/shared/zone-tag.js` (run the script with `node --import tsx` so the TS import
    resolves).

    Record findings in a new dated section of SPIKE-NOTES.md: winning URL form with observed
    card count, which coordinate source hit and on how many of the 6 pages, the exact shape of
    the location strings seen, and any municipality names outside the three zones. Note that
    this supersedes the tracer-era D-16 stance of leaving coords null — the centroid fallback
    is now a first-class path. Only selectors actually observed may be written down. Extract
    no seller name, phone, email, or chat handle (V8 minimization).

    If Subito serves a block page, captcha, or non-200 on the candidate forms, stop and report
    that instead of inventing selectors — the rest of this plan depends on real observations.
  </action>
  <verify>
    <automated>cd scraper &amp;&amp; node --import tsx scripts/spike-subito-geo.mjs | tee /tmp/whr-geo-recon.txt &amp;&amp; grep -Eq 'zone=(centro_storico|mestre_marghera|lido_murano)' /tmp/whr-geo-recon.txt &amp;&amp; grep -c 'source=' /tmp/whr-geo-recon.txt</automated>
  </verify>
  <done>The script prints, for 6 real Venice-scoped detail pages, the coordinate source and location string per page, and at least one page resolves to a real zone. SPIKE-NOTES.md carries a new dated section naming the winning URL form (with card count) and the coordinate/location sources that actually fired.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Repair geo resolution so Venice listings get a zone</name>
  <files>scraper/src/subito/extract.ts, scraper/src/subito/extract.test.ts, scraper/src/geo/municipality-centroids.json, scraper/src/geo/mestre-marghera.geojson, scraper/src/geo/lido-murano.geojson, lib/geo/geojson/mestre-marghera.geojson, lib/geo/geojson/lido-murano.geojson, scraper/src/shared/zone-tag.test.ts</files>
  <behavior>
    - `resolveCoords` returns coordinates from the highest-priority source that the Task 1
      recon proved present, and reports which source won.
    - Coordinates outside the Venice bbox are still rejected, and that rejection is
      distinguishable from "no coordinates found at all".
    - A location string like a municipality followed by a bracketed province code resolves to
      its centroid; a string naming a locality outside the three zones resolves to nothing.
    - "Lido di Jesolo (VE)" does not resolve to the Venice Lido centroid.
    - A string containing both a comune-wide name and a specific locality resolves to the
      specific locality (a Mestre address is not tagged centro_storico).
    - Every entry in municipality-centroids.json produces a non-null zone through `tagZone`.
  </behavior>
  <action>
    Widen coordinate extraction in `extract.ts` to try, in the priority order the recon
    established, the sources that were actually observed (embedded page-data JSON, JSON-LD geo
    object, raw-HTML latitude/longitude keys tolerating quoted numbers and negative values,
    map-URL coordinate pairs). Keep the Venice bbox check and the finite-number guards, and
    have `resolveCoords` additionally report the winning source so the worker can log it;
    `RawListing` keeps its current shape.

    Widen location text capture the same way: keep the current selectors as fallbacks and add
    the ones the recon proved, ending with a whole-body text scan for a municipality followed
    by a bracketed Veneto province code, which survives class-name churn.

    Make centroid lookup specific instead of naive substring matching. Match locality entries
    before comune-wide entries, and longer names before shorter ones, so a locality wins over
    the comune name. Rename the ambiguous Lido entry to its full "Lido di Venezia" form.

    Expand municipality-centroids.json with Venice localities that belong to the three existing
    zones — the historic-centre sestieri and Giudecca, the mainland localities around Mestre
    and Marghera, and the island localities around the Lido and Murano. Hard rule: an entry may
    only be added if `tagZone` returns a zone for its coordinates. Do not add localities that
    are genuinely outside the three zones (Chioggia, Mira, Jesolo, Burano, Pellestrina and
    friends) — a null zone for those is correct behaviour, not a bug.

    Two zone rectangles currently exclude their own namesakes (see verified_facts #2). Extend
    `mestre-marghera.geojson` south so the Marghera centroid falls inside it, and
    `lido-murano.geojson` north so the Murano centroid falls inside it. Keep the edits minimal
    and keep the rectangles' point order/closing point valid. Copy both edited files to
    `lib/geo/geojson/` so the scraper and UGC taggers stay byte-identical (verified_facts #3);
    the lido rectangle will now overlap the centro_storico rectangle in a narrow band, which is
    harmless because `tagZone` checks centro_storico first — say so in the summary.

    Create `scraper/src/subito/extract.test.ts` covering the behaviours above, driving
    `resolveCoords` with small HTML fixture strings rather than a live page. Extend
    `scraper/src/shared/zone-tag.test.ts` with a data-driven case that loads
    municipality-centroids.json and asserts a non-null zone for every entry — that test is the
    standing guard against a centroid drifting outside its rectangle again.
  </action>
  <verify>
    <automated>cd scraper &amp;&amp; npm test -- src/subito/extract.test.ts src/shared/zone-tag.test.ts src/shared/normalize.test.ts</automated>
    <automated>cd /home/guang/Projects/Experiments/snap-it-free &amp;&amp; for f in mestre-marghera lido-murano centro-storico; do diff -q "scraper/src/geo/$f.geojson" "lib/geo/geojson/$f.geojson"; done &amp;&amp; npm run test:lib</automated>
  </verify>
  <done>Scraper geo tests pass including the every-centroid-has-a-zone case; the three geojson pairs are identical across scraper and lib; the lib test suite still passes with the widened rectangles.</done>
</task>

<task type="auto">
  <name>Task 3: Narrow crawl to Venice, gate on geo yield, then run for real and measure Elenco</name>
  <precondition>SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set to non-empty values in scraper/.env and migrations 001–010 are applied to the target project.</precondition>
  <files>scraper/src/subito/categories.ts, scraper/src/subito/categories.test.ts, scraper/src/subito/extract.ts, scraper/src/shared/validate-run.ts, scraper/src/shared/validate-run.test.ts, scraper/src/config.ts, scraper/src/worker.ts, scraper/scripts/check-visible-listings.mjs</files>
  <action>
    Replace the three Veneto-wide entries in `categories.ts` with the Venice-scoped form Task 1
    confirmed live, keeping the comment accurate and keeping pagination query params out. Update
    `categories.test.ts` so the path assertion matches the confirmed Venice-scoped shape (the
    current region-path assertion is what CONTEXT flagged as needing an update) and keep the
    no-pagination-param assertion.

    Fix the category-vs-detail decision in `resolveDetailUrls` (verified_facts #5): extract a
    small exported predicate that recognises a regalo category path for any location segment
    rather than hardcoding one region, and cover it in `extract.test.ts` with one category URL
    and one detail URL.

    Close the silent-failure hole (CONTEXT discretion item). Add a geo-resolution-rate threshold
    constant to `config.ts`, env-overridable so an operator can tune it without a code change,
    defaulting to half the batch. Append two optional trailing parameters to `validateBatch` —
    the observed geo-resolution rate and its minimum — so existing call sites and tests keep
    working, and return a failure whose reason names the geo resolution rate explicitly. Add
    test cases for pass and fail. In `worker.ts`, compute the share of extracted listings with
    non-null coordinates and the share that land in a zone (import the zone helpers directly),
    log both alongside the selector rate, guard against an empty batch, pass the geo rate into
    `validateBatch`, and map the new reason to its own failure code in `parseValidationFailure`
    so the operator alert says what broke. Leave `selector_hit_rate` semantics and the
    `scrape_runs` schema untouched — no migration in this task.

    Add `scraper/scripts/check-visible-listings.mjs`, the measurement tool this fix is judged
    by. Using the service-role client, print: Subito rows visible in `listings_public`, total
    visible rows, active Subito rows in the base table, and how many of those have a zone.
    Print counts and location-free diagnostics only — never the key, never seller fields. Exit
    non-zero when fewer than 5 Subito rows are visible.

    Then run the pipeline for real from `scraper/`: full scraper suite, one worker run under a
    timeout, then the measurement script. Expired rows revive themselves through the update
    path (verified_facts #4), so do not delete existing rows and do not touch the two E2E UGC
    posts.

    Honesty rules for this task, both non-negotiable: if the run trips the geo gate, do not
    lower the threshold to force a pass — report the observed rate and the per-listing location
    strings. If the visible count lands between 2 and 4, do not weaken the script's exit
    threshold — report the actual number and say whether the shortfall is geo-resolution failure
    or genuinely thin Venice supply for these three categories, with the evidence for that call.
  </action>
  <verify>
    <automated>cd scraper &amp;&amp; npm test</automated>
    <automated>cd scraper &amp;&amp; timeout 1200 npm start 2>&amp;1 | tee /tmp/whr-run.log; grep -Eiq 'geo' /tmp/whr-run.log</automated>
    <automated>cd scraper &amp;&amp; node --import tsx scripts/check-visible-listings.mjs</automated>
    <human-check>Start the app (`npm run dev`), open /list, and confirm scraped Subito cards render with zone labels — not an empty state.</human-check>
  </verify>
  <done>The scraper suite passes; a real run logs a geo-resolution rate and persists; `check-visible-listings.mjs` exits zero with at least 5 Subito rows visible in `listings_public`; /list shows scraped cards. If the count falls short, the reported evidence distinguishes extraction failure from genuine Venice supply.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| subito.it DOM → scraper | Fully untrusted remote HTML: titles, descriptions, coordinates, location strings |
| scraper (service role) → listings table | Writes bypass RLS; bad data reaches the public view directly |
| local shell → scraper/.env | Service-role key and alert credentials live here |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-whr-01 | Tampering | extract.ts field capture → listings.title/raw_payload | medium | mitigate | Keep text-node extraction (no innerHTML reads), keep the 500-char title truncation, and keep every row going through `CanonicalListingSchema.parse` in normalize before persist |
| T-whr-02 | Spoofing | resolveCoords / centroid table → listings.geom | medium | mitigate | Keep finite-number and Venice-bbox validation on every new coordinate source; enforce the every-centroid-resolves-to-a-zone test so no entry can silently place pins outside the served area |
| T-whr-03 | Information disclosure | spike-subito-geo.mjs, check-visible-listings.mjs | medium | mitigate | Scripts print counts, coordinate sources, and location strings only — no service-role key echo, and no seller name/phone/email/chat capture (V8 minimization, SPIKE-NOTES) |
| T-whr-04 | Denial of service | crawler request volume vs Subito ToS | low | accept | Venice narrowing keeps the URL count at three and reduces total detail-page fetches; no pagination params added; posture unchanged from docs/legal/subito-scraping-note.md |

No package-manager installs are introduced by this plan, so no supply-chain legitimacy
checkpoint is required.
</threat_model>

<verification>
1. `cd scraper && npm test` — full scraper suite green, including the new extract tests and the
   every-centroid-has-a-zone guard.
2. `npm run test:lib` and `npm run lint` at the repo root — widened rectangles do not regress
   UGC zone tagging or types.
3. `diff` of the three geojson pairs across `scraper/src/geo/` and `lib/geo/geojson/` — identical.
4. One real worker run logs a geo-resolution rate and a zone rate next to the selector rate.
5. `node --import tsx scraper/scripts/check-visible-listings.mjs` exits zero with at least 5
   Subito rows visible in `listings_public`.
6. Manual: /list renders scraped Subito cards.
</verification>

<success_criteria>
- At least 5 `source='subito'` rows are visible in `listings_public`, measured by script, up
  from the verified baseline of 1.
- Elenco renders scraped items.
- `SUBITO_CATEGORY_URLS` are Venice-scoped and their live card counts are recorded in
  SPIKE-NOTES.md.
- A future geo regression fails the run with a geo-specific reason and an operator alert
  instead of scoring a 1.000 selector rate.
- Scraper and lib zone geojson remain byte-identical.
- No rows deleted, no schema migration, no UI files touched.
</success_criteria>

<output>
Create `.planning/quick/260803-whr-fix-subito-geo-zone-pipeline-so-scraped-/260803-whr-SUMMARY.md` when done,
recording: the confirmed Venice URL form and its live card count, which coordinate source won
and on what share of pages, the centroid entries and rectangle edits made, the observed
geo-resolution and zone rates from the real run, and the final visible-listing count.
</output>
