# Phase 8: Subito Regalo URL Matrix - Context

**Gathered:** 2026-08-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 expands Subito scraping from **3 hardcoded Venice regalo URLs** to a **configurable city × category matrix** managed at `/admin/sources/subito`. v1 covers **Venice + Padova** (Veneto) and **all 17 verified regalo category slugs** (including `animali` and `usato`). Configuration persists in existing `scraper_sources.target_urls` (Phase 6 D-18). The worker ingests Padova listings, stores **city**, **region**, and **category slug**, fixes the broken category parser, relaxes consumer visibility rules for non-Venice listings, and adds **Subito category filter chips** in Elenco.

**In scope:** Admin hybrid matrix UI + recommended seed button; Veneto URL validation (venezia + padova); Padova spike gate; `city` + `region` columns; `listings_public` view update; category parser fix; Elenco category display + 17-chip horizontal filter; existing dedupe for usato overlap; admin URL-count warning.

**Out of scope:** National region picker UI (static hint only); multi-worker / multi-process parallel scraping; Padova zone polygons; pagination beyond page 1; FB/Vinted/Wallapop crawlers.

</domain>

<decisions>
## Implementation Decisions

### Admin URL Matrix UX
- **D-01:** **Hybrid matrix** — City + category checkboxes **above** the existing `target_urls` textarea; **Generate** populates the textarea; operator may edit lines manually — **Reversibility:** reversible.
- **D-02:** **URLs-only persistence** — Matrix is a generator only; `scraper_sources.target_urls` string array is the sole stored config (no matrix JSON column) — **Reversibility:** reversible.
- **D-03:** **Veneto regalo URL validation** — Replace Venice-only check in `lib/admin/url-validate.ts` with pattern allowing `venezia` **or** `padova` paths matching `/annunci-veneto/regalo/{cat}/{city}/{city}/` — **Reversibility:** reversible.
- **D-04:** **"Apply recommended seed" button** — One click fills textarea with Venice + Padova × all 17 category slugs (34 URLs) — **Reversibility:** reversible.
- **D-05:** **Custom URLs allowed** — Generated and manual lines coexist; save merges all non-empty lines — **Reversibility:** reversible.
- **D-06:** **Dedupe on Generate and save** — Remove duplicate URLs when generating and before persisting — **Reversibility:** reversible.
- **D-07:** **Matrix defaults** — Venice + Padova checked; all 17 categories checked on page load — **Reversibility:** reversible.
- **D-08:** **Admin category labels** — Italian Subito catalog labels in checkboxes; slug in tooltip — **Reversibility:** reversible.
- **D-09:** **Preview feedback** — Show selected URL count + one-line template hint (`/annunci-veneto/regalo/{slug}/{city}/{city}/`); no full URL list preview — **Reversibility:** reversible.
- **D-10:** **Future-region hint** — Static one-line note that URL template supports `annunci-{region}/…` for later expansion; no disabled region picker — **Reversibility:** reversible.
- **D-11:** **High URL count warning** — Non-blocking admin banner when ≥30 URLs selected: expect longer scrape run — **Reversibility:** reversible.

### Initial Seed
- **D-12:** **Admin button only** — No SQL migration auto-seeds 34 URLs; operator applies recommended seed explicitly — **Reversibility:** reversible.
- **D-13:** **Keep 3-URL code fallback** — `scraper/src/subito/categories.ts` fallback remains until operator saves from admin — **Reversibility:** reversible.
- **D-14:** **Confirm on overwrite** — "Apply recommended seed" prompts if textarea already has URLs: replace current N with recommended 34? — **Reversibility:** reversible.
- **D-15:** **Padova spike gate** — Plan includes spike task to verify `padova/padova` URL returns 200 + listings before Padova URLs ship in recommended seed constant — **Reversibility:** reversible.

### Category Scope (Scraper)
- **D-16:** **Full catalog in v1 seed** — All **17 verified slugs** × 2 cities, including `animali` and `usato` — **Reversibility:** reversible.
- **D-17:** **Store category slug** — `listings.category` = Subito slug (e.g. `arredamento-casalinghi`); Italian display label from catalog map — **Reversibility:** reversible.
- **D-18:** **Parse category from listing URL** — Fix `extractCategoryFromSubitoUrl()` to read slug from detail path (`/arredamento-casalinghi/slug-id.htm`), not `/regalo/` segment — **Reversibility:** reversible.
- **D-19:** **usato overlap dedupe** — Rely on existing `external_url` dedupe at persist; no special usato handling — **Reversibility:** reversible.
- **D-20:** **Scrape volume posture (Claude discretion)** — Single worker, one Crawlee run; use **Standard** anti-block preset with **low concurrency** (minConcurrency 1–2) to balance block risk vs runtime for 34 URLs — **Reversibility:** reversible.

### Padova & Location Schema
- **D-21:** **Show Padova on consumer map** — Listings with `zone = null` appear when `lat`/`lng` resolved — **Reversibility:** costly — query + view changes.
- **D-22:** **Zone filter behavior** — Chip **"All"** includes Venice-zoned listings **plus** zone-null listings with coords; Venice-specific zone chips remain Venice-only — **Reversibility:** reversible.
- **D-23:** **Venice-centered map** — Default viewport unchanged; Padova pins visible when user pans — **Reversibility:** reversible.
- **D-24:** **Coords required for map pin** — No city-centroid fallback; listings without coords are list-only (if surfaced at all) — **Reversibility:** reversible.
- **D-25:** **Add `city` text column** — Set at ingest from scrape URL path (`venezia`, `padova`); free text (not enum) for national scale — **Reversibility:** costly — schema migration.
- **D-26:** **Add `region` text column** — Set at ingest from URL (`veneto` from `annunci-veneto` segment); pairs with city for national path — **Reversibility:** costly — schema migration.
- **D-27:** **City label on cards** — Elenco shows city name (e.g. "Padova") from `city` column when `zone` is null — **Reversibility:** reversible.

### Consumer Visibility (listings_public)
- **D-28:** **Relax view filter** — `listings_public` includes rows where `zone IS NOT NULL` **OR** (`city IS NOT NULL` AND `lat IS NOT NULL` AND `lng IS NOT NULL`) — **Reversibility:** costly — view migration + app query alignment.

### Category in Consumer App (Elenco)
- **D-29:** **DB category primary** — Card badge uses `listings.category` slug → Italian label; title keyword inference (`inferListingCategory`) is **fallback only** when category null — **Reversibility:** reversible.
- **D-30:** **Add Subito category filter chips** — Horizontal scroll row of all **17 Subito slug chips** with Italian labels; default **"Tutte"** selected — **Reversibility:** reversible.
- **D-31:** **Category i18n via translate pipeline** — Populate `category_en` / `category_zh` at ingest through existing Phase 6 auto-translate when enabled; chips use locale column — **Reversibility:** reversible.

### Claude's Discretion
- **D-20** scrape concurrency tuning (Standard preset, minConcurrency 1–2) — optimize for block risk over speed unless spike shows headroom.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase & requirements
- `.planning/ROADMAP.md` — Phase 8 goal and 6 success criteria
- `.planning/REQUIREMENTS.md` — SCRP-01 extended scope
- `.planning/phases/06-scraper-admin-console-configurable-sources-frequency-anti-bl/06-CONTEXT.md` — D-18 target_urls, D-09/D-10 Venice defaults, admin surface

### Subito recon & spikes
- `.planning/phases/08-subito-regalo-url-matrix-venice-padova-veneto-all-categories/08-CONTEXT.md` — regalo category catalog (17 slugs, counts, URL form)
- `scraper/src/subito/SPIKE-NOTES.md` — Venice URL forms, geo fallbacks, comune vs province counts
- `scraper/src/subito/categories.ts` — current 3-URL fallback

### Code touchpoints
- `components/admin/SourceDetailClient.tsx` — existing target_urls textarea
- `lib/admin/url-validate.ts` — Venice-only validation to extend
- `scraper/src/subito/normalize.ts` — broken `extractCategoryFromSubitoUrl`
- `scraper/src/subito/crawler.ts` — Crawlee multi-URL run
- `lib/listings/queries.ts` / `lib/listings/client-queries.ts` — zone-not-null filters
- `supabase/migrations/007_ugc_messaging_reports.sql` — `listings_public` view definition (`zone is not null`)
- `supabase/migrations/018_scraper_admin.sql` — `category`, `category_en`, `category_zh` columns
- `lib/listings/categories.ts` — title inference to demote to fallback
- `components/listings/ListListingCard.tsx` — category display

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SourceDetailClient` — PATCH save flow for `target_urls`; extend with matrix panel above textarea
- `validateTargetUrls` / `validateTargetUrl` — host + path validation; extend for padova
- `scraper/src/config-loader.ts` — merges DB `target_urls` over env fallback
- `runSubitoCrawler` — already accepts URL array; Crawlee handles multi-request concurrency
- `listings.category` + translation columns — schema exists; parser + UI wiring missing
- `inferListingCategory` / `matchesListingCategory` — replace primary filter path with DB slug mapping

### Established Patterns
- Phase 6 admin: Stitch document-first, table-heavy ops layout; freeform config fields
- Consumer feed: `listings_public` view + `.not('zone', 'is', null)` in queries — must align with D-28
- Zone chips: horizontal filter pattern in map/Elenco — reuse for 17 category chips
- Ingest: `normalize.ts` sets zone from Venice polygons; Padova stays `zone = null`

### Integration Points
- Admin matrix Generate → `target_urls[]` → existing PATCH `/api/admin/sources/subito`
- Worker config load → expanded URL list → crawler → normalize (add city/region/category) → persist
- Migration: `city`, `region` columns + `listings_public` view rewrite
- Elenco: category chips filter query or client filter on `category` slug

</code_context>

<specifics>
## Specific Ideas

- Recommended seed = **34 URLs** (17 categories × Venice + Padova)
- Admin matrix shows Italian labels matching live Subito catalog (2026-08-05 recon)
- User wants **maximum catalog coverage** including `animali` and `usato` despite volume
- User wants **national-scale location model** (`city` + `region` text columns) rather than display-time derivation
- Padova listings should appear on map without inventing Venice zone polygons

</specifics>

<deferred>
## Deferred Ideas

- **Multi-worker parallel scraping** — separate worker processes per category/region; user asked about parallel workers — out of Phase 8 scope
- **National region picker UI** — disabled dropdown for Lombardia, Lazio, etc.; static hint only in Phase 8
- **Padova zone polygons** — fourth zone chip or geo polygons for Padova
- **Pagination / multi-page category crawl** — `?o=` disallowed by robots.txt; future phase
- **Category filter "remember last selection"** — user chose "Tutte" default instead
- **Map fit-all bounds** when Padova pins exist — user chose Venice-centered default

</deferred>

---

*Phase: 08-subito-regalo-url-matrix-venice-padova-veneto-all-categories*
*Context gathered: 2026-08-05*
