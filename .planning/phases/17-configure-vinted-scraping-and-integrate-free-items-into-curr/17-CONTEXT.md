# Phase 17: Vinted Scraping & Subito Category Integration — Context

**Gathered:** 2026-08-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 17 delivers a **live Vinted scraper** and integrates **free (€0) Vinted listings** into the existing consumer experience using the **17 Subito regalo slugs** as canonical category IDs.

**In scope:**
- Wave 0 spike proving Vinted HTTP/JSON extract on 3 live URLs (hard gate)
- New `scraper/src/vinted/` crawler module reusing Phase 15 HttpCrawler + incremental orchestration
- Admin: flip `vinted` source to `live`, seed default Venice + Padova target URL templates (disabled by default), mirror Subito source-detail UI
- DB migration: extend `listing_source` enum with `vinted`; persist `source=vinted` listings
- Category: Vinted→Subito slug mapping table + title inference; extend `resolveCanonicalCategorySlug`
- Consumer: mixed chronological feed, FREE badge, small Vinted source chip on grid cards, external link on detail, favorites + search unchanged patterns
- Translation: same scraper auto-translate pipeline as Subito

**Out of scope:**
- Consumer source filter in FilterSheet (deferred)
- Separate feed tabs or source-segregated views
- Facebook / Wallapop / eBay crawlers
- Favorites folder UI (deferred v3+, Phase 12)
- FilterSheet category label or layout changes (Phase 12 D-14, Phase 12.1 i18n)
- Production deploy cutover (Phase 7)

**Depends on:** Phase 16 (proxy cost posture); reuses Phase 15 crawl stack and Phase 12 canonical category model.

</domain>

<decisions>
## Implementation Decisions

### Free-item definition
- **D-17-01:** **€0 price only** qualifies a Vinted listing as free — no keyword-only or negotiable-price heuristics. — **Reversibility:** costly — widening the filter later changes listing cardinality and user trust.
- **D-17-02:** **Reject missing or ambiguous price** at extract — do not accept gratis/regalo title fallback when price field is absent. — **Reversibility:** reversible.
- **D-17-03:** **Admin-configured catalog URLs only** — no site-wide search crawl; operator controls scope via `scraper_sources.target_urls`. — **Reversibility:** reversible.
- **D-17-04:** **Reject non-free at extract layer** — log reason `not_free`; never enter persist pipeline. — **Reversibility:** reversible.

### Geographic scope
- **D-17-05:** **Venice + Padova parity** with Subito URL matrix — same two cities for feed city chips (D-01). — **Reversibility:** costly — adding cities touches URL seeds and bbox rules.
- **D-17-06:** **Location baked into admin target URLs** — each URL includes Vinted location filter params. — **Reversibility:** reversible.
- **D-17-07:** **Require coords OR resolvable city label** to persist — reject listings with neither. — **Reversibility:** reversible.
- **D-17-08:** **Mirror Subito zone tagging** when coords exist — reuse `tagZone()` + Venice polygons; Padova skips zones. — **Reversibility:** reversible.
- **D-17-09:** **Seed default Venice + Padova URL templates** when source flips to live — operator edits in admin; not empty start. — **Reversibility:** reversible.
- **D-17-10:** **City assignment: URL template + JSON fallback** — URL encodes venice/padova intent; JSON city field validates. — **Reversibility:** reversible.
- **D-17-11:** **Reject coords outside Venice/Padova bbox** at persist — same bounding boxes as Subito schema validation. — **Reversibility:** reversible.
- **D-17-12:** **Municipality centroid fallback** when JSON has city but no coords — reuse Subito Phase 15 pattern for distance metadata. — **Reversibility:** reversible.
- **D-17-13:** **Prefer pickup/meet-up location** over seller profile city when Vinted exposes both. — **Reversibility:** reversible.
- **D-17-14:** **Separate Venice vs Padova URL sets** in admin — distinct target URL groups per city. — **Reversibility:** reversible.
- **D-17-15:** **Reject shipping-only / no local pickup** listings — free items must be locally collectible. — **Reversibility:** costly — relaxing this changes product “near me” promise.

### Category mapping
- **D-17-16:** **Hybrid mapping** — Vinted category ID → Subito slug lookup table at scrape time; **title inference fallback** via existing `INFERRED_CATEGORY_TO_SLUG`. — **Reversibility:** reversible.
- **D-17-17:** **Extend `resolveCanonicalCategorySlug`** with `vinted` source branch — DB slug first, Vinted map, inference, null. — **Reversibility:** costly — central resolver API.
- **D-17-18:** **Unmapped fallback → `null` (uncategorized)** — excluded when specific category filters active (Phase 12 D-08); do not force `usato` catch-all. *(Claude discretion — user deferred.)* — **Reversibility:** reversible.
- **D-17-19:** **One target URL per Subito slug × city** where Vinted URL structure supports it — category intent encoded in URL template metadata (Subito matrix mental model). — **Reversibility:** costly — URL matrix size drives crawl cost.
- **D-17-20:** **Document Vinted→Subito table** in `lib/listings/canonical-categories.ts` (or adjacent module) + unit tests (CAT-03 pattern). — **Reversibility:** reversible.
- **D-17-21:** **No FilterSheet UI changes** — same 17 Subito labels; Vinted listings match via canonical slug only. — **Reversibility:** one-way — UI contract locked in Phase 12/12.1.
- **D-17-22:** **Same auto-translate pipeline** as Subito — `title_en` / `title_zh` via scraper translation queue. — **Reversibility:** reversible.
- **D-17-23:** **Add `vinted` to ListingSource enum** — DB migration on `listing_source` + `scraper/src/shared/schema.ts` + `lib/listings/types.ts`. — **Reversibility:** one-way — requires migration to remove.
- **D-17-24:** **Many Vinted categories → one Subito slug** is acceptable (e.g. apparel subcats → `abbigliamento-accessori`). — **Reversibility:** reversible.

### Feed presentation
- **D-17-25:** **Mixed chronological feed** — Vinted + Subito + UGC sorted by `posted_at`; no source segregation. — **Reversibility:** reversible.
- **D-17-26:** **Small source badge on grid card** — monochrome Stitch chip (e.g. “Vinted”) alongside FREE badge. — **Reversibility:** reversible.
- **D-17-27:** **No consumer source filter** — FilterSheet unchanged; source filter deferred to future phase. — **Reversibility:** reversible.
- **D-17-28:** **Detail / claim flow opens `external_url`** in new tab — same scraped-listing pattern as Subito; no in-app Vinted claim. — **Reversibility:** reversible.
- **D-17-29:** **Show FREE badge** on Vinted €0 grid cards — consistent with Subito regalo cards. — **Reversibility:** reversible.
- **D-17-30:** **Favorites work identically** — heart + login gate; flat favorites grid unchanged (Phase 12 D-01). — **Reversibility:** reversible.
- **D-17-31:** **Feed search includes Vinted titles** — translated fields when available. — **Reversibility:** reversible.

### Admin & crawl config
- **D-17-32:** **Reuse Subito HttpCrawler + incremental pattern** — new `scraper/src/vinted/` module; extend `runSourceScrape` routing beyond `subito` only. — **Reversibility:** costly — worker architecture extension.
- **D-17-33:** **Share global `proxy_enc`** from `scraper_global_config` — Phase 16 direct/degraded fallback applies to Vinted runs. — **Reversibility:** reversible.
- **D-17-34:** **Flip `implementation_status` to `live`; `enabled=false` by default** — operator enables after URL review + manual first run. — **Reversibility:** reversible.
- **D-17-35:** **Default crawl interval 90 min** — same as Subito; operator tunes per source in admin. — **Reversibility:** reversible.
- **D-17-36:** **Wave 0 spike required** on 3 live Vinted URLs before implementation waves — proves JSON extract path (Phase 15 gate pattern). — **Reversibility:** costly — plan waves blocked on spike artifact.
- **D-17-37:** **Mirror Subito source detail admin UI** — macOS settings layout, URL chip matrix, run stats on source card. — **Reversibility:** reversible.

### Claude's Discretion
- **D-17-18:** Unmapped category → `null` rather than `usato` catch-all (aligns with Phase 12 D-08 uncategorized semantics).
- Wave 0 spike pass criteria fine-tuning (exact JSON fields, TLS/proxy needs for vinted.it).
- Default URL template contents per Subito slug × city (researcher documents viable Vinted search URL patterns).
- Validation thresholds for Vinted batch runs (adapt Phase 15 JSON completeness gate).
- Source badge visual treatment within Stitch tokens (exact label: “Vinted” vs localized).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` — Phase 17 goal, depends on Phase 16, execution order (… → 16 → 17 → 7)
- `.planning/PROJECT.md` — multi-source supply strategy; canonical category goal #4
- `.planning/REQUIREMENTS.md` — SCRP-E01–E08 (Subito crawl baseline); CAT-01–03 (canonical categories)

### Canonical categories (Phase 12)
- `.planning/phases/12-canonical-category-mapping/12-CONTEXT.md` — 17 Subito slugs, resolver order, FilterSheet unchanged
- `lib/listings/canonical-categories.ts` — `resolveCanonicalCategorySlug`, `INFERRED_CATEGORY_TO_SLUG`, `POST_CATEGORY_TO_SLUG`
- `lib/admin/subito-regalo-catalog.ts` — `SUBITO_REGALO_CATALOG` (17 slug source of truth)

### Scraper baseline (Phase 15)
- `.planning/phases/15-scraper-incremental-crawl-and-search-efficiency/15-CONTEXT.md` — HttpCrawler, incremental early-stop, proxy posture
- `scraper/src/worker.ts` — `runSourceScrape` (currently subito-only crawl branch)
- `scraper/src/subito/crawler.ts` — HttpCrawler + Playwright fallback pattern to mirror
- `scraper/src/subito/http-extract.ts` — JSON extract + centroid resolution pattern
- `scraper/src/shared/schema.ts` — `CanonicalListingSchema`, `ListingSource` enum (needs `vinted`)
- `scraper/src/shared/persist.ts` — persist + translation queue enqueue
- `scraper/src/worker-placeholder.ts` — `coming_soon` skip behavior

### Admin sources (Phase 6)
- `lib/admin/schemas.ts` — `SOURCE_SLUGS` includes `vinted`
- `lib/admin/url-validate.ts` — `vinted.it` host allowlist
- `components/admin/admin-messages.ts` — source display names and icons

### Proxy (Phase 16)
- `.planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-RESEARCH.md` — direct vs residential posture

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scraper/src/subito/*` — HttpCrawler orchestration, early-stop, known-set, crawl-hash, fallback queue — primary template for `scraper/src/vinted/`
- `lib/listings/canonical-categories.ts` — extend with Vinted category map + `vinted` source branch
- `lib/admin/url-validate.ts` — already validates `vinted.it` URLs for admin target_urls
- `components/admin/*` — Subito source detail page patterns for Vinted parity (D-17-37)
- `scraper/src/shared/zone-tag.ts` — Venice zone tagging for listings with coords

### Established Patterns
- Admin seeds five sources; only `subito` is `live` — `vinted` is `coming_soon` until this phase
- Worker throws `No crawler implementation for source` for non-subito live sources today
- Scraper `ListingSource` enum (`subito|facebook|ugc`) is narrower than admin `SOURCE_SLUGS` — migration must align DB + scraper + frontend types
- Phase 12: FilterSheet uses 17 Subito slug labels; matching via `resolveCanonicalCategorySlug` only
- Grid cards: FREE badge + heart + distance/time metadata (Phase 11); add source chip without layout redesign

### Integration Points
- `runSourceScrape` in `scraper/src/worker.ts` — add `vinted` branch beside `subito`
- `resolveCanonicalCategorySlug` in `lib/listings/canonical-categories.ts` — add `vinted` path (today only `facebook` stub)
- Feed pipeline: `composeFeedListings` / FilterSheet — no new filters; Vinted listings flow through existing category + city filters when slug/city set
- Admin `/admin/sources/vinted` — flip status, URL matrix editor, manual run trigger
- Translation queue — same post-persist path as Subito listings

</code_context>

<specifics>
## Specific Ideas

- User wants Vinted supply **folded into existing Subito category filters** — not a parallel category system or new consumer filter surfaces.
- Geographic and URL structure should **mirror Subito Venice + Padova matrix** mental model (separate URL sets, one slug per URL where possible).
- **Strict free definition (€0 only)** — Vinted is not a regalo marketplace; price field is the primary gate.
- **Local pickup required** — shipping-only free items excluded to preserve “near me” product value.
- Admin should **not auto-enable** Vinted on deploy — operator reviews seeded URLs first.

</specifics>

<deferred>
## Deferred Ideas

- **Consumer source filter** (Subito only / Vinted only) in FilterSheet — new capability; own phase
- **Separate source tabs** or segregated feed views — out of scope
- **Favorites grouped by source** — out of scope (flat grid locked Phase 12)
- **Separate Vinted search** — out of scope
- **Minimal admin UI** (URL list only, no chip matrix) — user chose full Subito parity instead
- **Vinted app deep links** on detail — user chose external URL in new tab
- **Skip translation for Vinted MVP** — user chose full translation pipeline parity

</deferred>

---
*Phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr*
*Context gathered: 2026-08-15*
