# Phase 18: Facebook Marketplace Scraping & Source Configuration — Context

**Gathered:** 2026-08-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 18 adds **Facebook Marketplace** as a configured scraper source — hard-gated by Wave 0 spike — and integrates **free listings** into the existing mixed feed using the **17 Subito regalo slugs** as canonical category IDs.

**In scope:**
- Wave 0 spike proving Playwright extract on 3 Venice search URLs with operator session + residential proxy (hard gate)
- New `scraper/src/facebook/` crawler module (Playwright-first, logged-in session)
- Admin: session upload + test UI, flip `facebook` to `live`, 6-URL seed matrix (Venice + Padova × 3 queries), mirror Subito source-detail UI
- DB migration: `session_enc` on `scraper_sources`; update `facebook.target_urls` to 6-URL matrix
- Category: Facebook→Subito slug mapping + title inference; extend `resolveCanonicalCategorySlug` (replace D-09 stub)
- Consumer: mixed chronological feed, FREE badge, Facebook source chip, external link on detail, favorites + search unchanged patterns
- Translation: same scraper auto-translate pipeline as Subito/Vinted
- Incremental early-stop after Wave 0 (reuse Phase 15 known-set pattern)

**Out of scope:**
- Consumer source filter in FilterSheet (deferred)
- Separate Facebook-only feed views or tabs
- Automated Facebook login in worker (operator-managed cookies only)
- Production deploy cutover (Phase 7)
- Wallapop / eBay crawlers
- Favorites category folder UI (deferred v3+)

**Depends on:** Phase 16 (proxy posture); Phase 15 (crawl stack patterns); Phase 17 (Vinted source integration template)

</domain>

<decisions>
## Implementation Decisions

### Free-item definition
- **D-18-01:** **Price field only** qualifies a Facebook listing as free — no keyword-only or search-URL-only acceptance. — **Reversibility:** costly — widening the filter changes listing cardinality and user trust.
- **D-18-02:** **Structured zero only** — accept numeric `0`, `"0"`, `"0.00"`, and localized `"Free"` / `"Gratis"` / `"Gratuito"` from the **price field**; reject `"negotiable"`, `"contact for price"`, or missing price. — **Reversibility:** reversible.
- **D-18-03:** **Reject missing or ambiguous price** at extract — log `not_free` or `price_ambiguous`; never enter persist pipeline (Vinted D-17-02 parity). — **Reversibility:** reversible.
- **D-18-04:** **Require local pickup / meet-up** — reject shipping-only listings (Vinted D-17-15 parity). — **Reversibility:** costly — relaxing this changes product “near me” promise.

### Auth, session & crawl stack
- **D-18-05:** **Logged-in Facebook session required** — Wave 0 must prove extract with authenticated session; anonymous crawl out of scope unless spike passes without login. — **Reversibility:** costly — plan waves blocked on spike artifact.
- **D-18-06:** **Operator-managed session cookies** — no automated FB login in worker; operator exports/pastes cookies via admin. — **Reversibility:** reversible.
- **D-18-07:** **Playwright-first** — browser session primary; HTTP reuse only if spike proves embedded JSON path without full navigation. — **Reversibility:** costly — worker architecture choice.
- **D-18-08:** **Residential proxy required from day one** for Facebook — Italian egress via shared `proxy_enc`; direct/degraded is not the default for FB (unlike Subito). — **Reversibility:** reversible.
- **D-18-09:** **On session expiry** — fail run with `session_expired`, admin banner; no silent partial crawl. — **Reversibility:** reversible.
- **D-18-10:** **Session upload on `/admin/sources/facebook`** — dedicated field + “Test session” validation before save. — **Reversibility:** reversible.
- **D-18-11:** **`session_enc` encrypted JSONB** on `scraper_sources` (same encryption pattern as `proxy_enc`). — **Reversibility:** one-way — requires migration to remove.
- **D-18-12:** **Pre-flight session probe** before each crawl run — lightweight marketplace page check; fail fast on login wall/checkpoint. — **Reversibility:** reversible.
- **D-18-13:** **Concurrency 1** — sequential URLs, single browser context. — **Reversibility:** reversible.
- **D-18-14:** **Keep `conservative` anti-block preset** — already seeded for `facebook` in `018_scraper_admin.sql`. — **Reversibility:** reversible.
- **D-18-15:** **Search result cards first** — detail page only when price, location, coords, or category missing (within fallback cap). — **Reversibility:** reversible.
- **D-18-16:** **Cap detail visits per run** — ~10% of listings or spike-tuned absolute cap; overflow deferred to next run (Subito D-15-16 pattern). — **Reversibility:** reversible.
- **D-18-17:** **Page 1 only for MVP** — no pagination until post-spike need proven (Phase 15 D-15-23 pattern). — **Reversibility:** reversible.
- **D-18-18:** **Incremental early-stop after Wave 0** — reuse `loadKnownListingSet` + crawl hash once stable `external_id` proven. — **Reversibility:** reversible.
- **D-18-19:** **Wave 0 pass criteria** — Playwright extract on all 3 Venice seed URLs with session + proxy: title, free price, image, `external_id`, location. Hard gate before implementation. — **Reversibility:** costly — blocks plan waves.
- **D-18-20:** **Wave 0 fail → hard stop** — keep `coming_soon`, no crawler implementation; document failure artifact in phase dir. — **Reversibility:** reversible.

### URL matrix, geography & admin
- **D-18-21:** **Venice + Padova parity** — separate URL sets per city (Vinted D-17-05). — **Reversibility:** costly — adding cities touches URL seeds and bbox rules.
- **D-18-22:** **Search-query matrix** — 6 default URLs: 2 cities × 3 queries (`gratis`, `regalo`, `free`); no 17-slug × city matrix (FB lacks Subito-style category URLs). — **Reversibility:** reversible.
- **D-18-23:** **Migration updates seeds** — replace 3 Venice-only placeholders with full 6-URL matrix. — **Reversibility:** reversible.
- **D-18-24:** **FB Marketplace path regex** in `url-validate.ts` — require `/marketplace/` + valid search params (mirror Subito regalo regex pattern). — **Reversibility:** reversible.
- **D-18-25:** **City assignment: URL template metadata + JSON fallback** — reject coords outside Venice/Padova bbox (Vinted D-17-10/11). — **Reversibility:** reversible.
- **D-18-26:** **Prefer pickup/meet-up location** over seller profile city when FB exposes both (D-17-13). — **Reversibility:** reversible.
- **D-18-27:** **Municipality centroid fallback** when city label but no coords (D-17-07/12). — **Reversibility:** reversible.
- **D-18-28:** **Mirror Subito `tagZone()`** when coords exist; Padova skips zones (D-17-08). — **Reversibility:** reversible.
- **D-18-29:** **Admin-configured URLs only** — no site-wide FB search crawl (D-17-03). — **Reversibility:** reversible.
- **D-18-30:** **Wave 0 tests 3 Venice URLs only** — Padova URLs ship in implementation migration; validated on first manual run / phase gate. — **Reversibility:** reversible.
- **D-18-31:** **Dedup by `external_id`** at crawl layer across overlapping query URLs per city. — **Reversibility:** reversible.
- **D-18-32:** **Flip `implementation_status` to `live`; `enabled=false` by default** (D-17-34). — **Reversibility:** reversible.
- **D-18-33:** **Default crawl interval 90 min** — same as Subito/Vinted (D-17-35). — **Reversibility:** reversible.
- **D-18-34:** **Full Subito admin source-detail UI parity** — URL chip matrix, city/query metadata, run stats, session field (D-17-37). — **Reversibility:** reversible.
- **D-18-35:** **`external_url`** = canonical `https://www.facebook.com/marketplace/item/{id}/` (D-17-28 pattern). — **Reversibility:** reversible.
- **D-18-36:** **48h scraped TTL** — same `expires_at` as other scraped sources. — **Reversibility:** reversible.
- **D-18-37:** **Shared global `proxy_enc`** — same residential proxy config as Vinted (D-17-33). — **Reversibility:** reversible.
- **D-18-38:** **No `listing_source` enum migration** — `facebook` already exists from Phase 1. — **Reversibility:** n/a.
- **D-18-39:** **Auto-hide report threshold stays 2** — same as Subito (`lib/reports/auto-hide.ts`). — **Reversibility:** reversible.

### Worker & feed integration
- **D-18-40:** **New `scraper/src/facebook/` module** — extend `runSourceScrape` with `facebook` branch beside `subito`/`vinted` (D-17-32 pattern). — **Reversibility:** costly — worker architecture extension.
- **D-18-41:** **Mixed chronological feed** — FB + Subito + Vinted + UGC by `posted_at` (D-17-25). — **Reversibility:** reversible.
- **D-18-42:** **FREE badge** on Facebook free grid cards (D-17-29). — **Reversibility:** reversible.
- **D-18-43:** **Small Facebook source chip** on grid cards — monochrome Stitch chip (D-17-26). — **Reversibility:** reversible.
- **D-18-44:** **No consumer source filter** — FilterSheet unchanged (D-17-27). — **Reversibility:** reversible.
- **D-18-45:** **Detail opens `external_url` in new tab** — no in-app FB claim (D-17-28). — **Reversibility:** reversible.
- **D-18-46:** **Favorites parity** — heart + login gate; flat grid (D-17-30). — **Reversibility:** reversible.
- **D-18-47:** **Feed search includes FB titles** — translated fields when available (D-17-31). — **Reversibility:** reversible.
- **D-18-48:** **Same auto-translate pipeline** as Subito/Vinted (D-17-22). — **Reversibility:** reversible.

### Category mapping
- **D-18-49:** **Hybrid mapping** — Facebook category ID → Subito slug lookup at scrape time; **title inference fallback** via `INFERRED_CATEGORY_TO_SLUG` (D-17-16). — **Reversibility:** reversible.
- **D-18-50:** **Extend `resolveCanonicalCategorySlug`** with `facebook` branch — replace D-09 stub (D-17-17). — **Reversibility:** costly — central resolver API.
- **D-18-51:** **Resolver order:** valid DB slug → `FACEBOOK_CATEGORY_TO_SLUG` → title inference → `null`. — **Reversibility:** reversible.
- **D-18-52:** **Unmapped fallback → `null` (uncategorized)** — excluded when specific category filters active (Phase 12 D-08; D-17-18). — **Reversibility:** reversible.
- **D-18-53:** **Many FB categories → one Subito slug** acceptable (D-17-24). — **Reversibility:** reversible.
- **D-18-54:** **`FACEBOOK_CATEGORY_TO_SLUG` in `canonical-categories.ts`** beside Vinted map + unit tests (CAT-03, D-17-20). — **Reversibility:** reversible.
- **D-18-55:** **Persist canonical slug at scrape time** before `persist.ts`. — **Reversibility:** reversible.
- **D-18-56:** **Re-resolve category when crawl hash changes** on re-crawl. — **Reversibility:** reversible.
- **D-18-57:** **Detail fallback for category** when missing on search card (within detail visit cap). — **Reversibility:** reversible.
- **D-18-58:** **Raw FB category ID in scrape logs/metadata only** — not consumer UI; aids map tuning. — **Reversibility:** reversible.
- **D-18-59:** **No category intent in search URLs** — mapping from listing JSON/title only; no per-slug URL matrix for FB. — **Reversibility:** reversible.
- **D-18-60:** **Best-effort map from Wave 0** — not blocking on all 17 Subito slugs; phase gate requires mapped + null fallback tests. — **Reversibility:** reversible.
- **D-18-61:** **Update D-09 stub tests** — `canonical-categories.test.ts` / `subito-categories.test.ts` expect map/inference, not always-null. — **Reversibility:** reversible.
- **D-18-62:** **No FilterSheet UI changes** — same 17 Subito labels; Phase 12.1 i18n for display (D-17-21). — **Reversibility:** one-way — UI contract locked in Phase 12/12.1.
- **D-18-63:** **Same filter path as Vinted** — `listingMatchesCategoryFilter` source-aware via canonical slug. — **Reversibility:** reversible.

### Claude's Discretion
- Wave 0 spike pass criteria fine-tuning (exact JSON field names, session cookie format).
- Detail visit cap exact percentage or absolute number (default ~10%).
- Source chip exact label (“Facebook” vs localized) within Stitch tokens.
- `FACEBOOK_CATEGORY_TO_SLUG` expansion post-Wave 0 as more category IDs discovered.
- Padova FB city slug strings in migration seed URLs (researcher documents from spike).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & upstream patterns
- `.planning/PROJECT.md` — multi-source supply strategy; FB Marketplace mentioned in core value
- `.planning/phases/17-configure-vinted-scraping-and-integrate-free-items-into-curr/17-CONTEXT.md` — primary template for new source integration (D-17-01–37)
- `.planning/phases/15-scraper-incremental-crawl-and-search-efficiency/15-CONTEXT.md` — incremental early-stop, fallback caps, proxy ADR
- `.planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-RESEARCH.md` — residential proxy posture (FB requires residential from D-18-08)

### Canonical categories (Phase 12)
- `.planning/phases/12-canonical-category-mapping/12-CONTEXT.md` — 17 Subito slugs, resolver order, FilterSheet unchanged
- `lib/listings/canonical-categories.ts` — `resolveCanonicalCategorySlug`, `INFERRED_CATEGORY_TO_SLUG` (extend with `FACEBOOK_CATEGORY_TO_SLUG`)
- `lib/admin/subito-regalo-catalog.ts` — `SUBITO_REGALO_CATALOG` (17 slug source of truth)

### Admin & seeds (Phase 6)
- `supabase/migrations/018_scraper_admin.sql` — `facebook` seeded `coming_soon`, `conservative` preset, 3 Venice search URLs
- `lib/admin/url-validate.ts` — `facebook.com` host allowlist (extend with marketplace path regex)
- `lib/admin/schemas.ts` — `SOURCE_SLUGS` includes `facebook`
- `components/admin/admin-messages.ts` — source display names and icons

### Scraper worker
- `scraper/src/worker.ts` — `runSourceScrape` (add `facebook` branch beside `vinted`)
- `scraper/src/vinted/crawler.ts` — reference for source module structure (FB differs: Playwright-first)
- `scraper/src/subito/crawler.ts` — incremental/known-set pattern to reuse after Wave 0
- `scraper/src/shared/schema.ts` — `ListingSource` enum includes `facebook`
- `scraper/src/shared/persist.ts` — persist + translation queue enqueue
- `scraper/src/shared/zone-tag.ts` — Venice zone tagging

### Consumer & moderation
- `lib/reports/auto-hide.ts` — `facebook` threshold = 2
- `lib/listings/subito-categories.test.ts` — D-09 facebook stub tests to update

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scraper/src/vinted/*` — source module + worker routing pattern (adapt for Playwright-first FB)
- `scraper/src/subito/*` — incremental known-set, early-stop, crawl hash, persist pipeline
- `lib/listings/canonical-categories.ts` — extend with `FACEBOOK_CATEGORY_TO_SLUG` + `facebook` resolver branch
- `lib/admin/url-validate.ts` — host allowlist exists; add marketplace path regex
- `components/admin/*` — Subito/Vinted source detail page patterns for parity (D-18-34)
- `scraper/src/shared/zone-tag.ts` — Venice zone tagging for listings with coords

### Established Patterns
- `facebook` in admin seed as `coming_soon`, `enabled=false`, `conservative` preset, 3 Venice search URLs
- Worker throws `No crawler implementation for source` for enabled non-implemented sources
- `resolveCanonicalCategorySlug` returns `null` for all `facebook` inputs today (D-09 stub — to be replaced)
- Phase 17 consumer pattern: mixed feed, source chip, FREE badge, external URL, no source filter
- `listing_source` enum already includes `facebook` — no enum migration needed

### Integration Points
- `runSourceScrape` in `scraper/src/worker.ts` — add `facebook` → `runFacebookCrawler`
- `resolveCanonicalCategorySlug` — replace D-09 stub with map + inference branch
- Admin `/admin/sources/facebook` — session field, URL matrix, flip status, manual run
- Feed pipeline — no new filters; FB listings flow through category + city filters when slug/city set
- Translation queue — same post-persist path as Subito/Vinted
- New migration — `session_enc` column + 6-URL seed update for `facebook`

</code_context>

<specifics>
## Specific Ideas

- User wants **strict free definition** (price field only) — FB search URLs are discovery only, not proof of free status.
- **Operator owns Facebook session** — paste/test cookies in admin; no automated login in worker.
- **Facebook is harder than Vinted** — Playwright-first, residential proxy required, conservative preset, concurrency 1.
- **Mirror Vinted integration breadth** — mixed feed, chip, translation, favorites, search — but **not** source filter or category URL matrix.
- **Wave 0 is a hard gate** — failure keeps source as planning-only; no partial crawler ship.

</specifics>

<deferred>
## Deferred Ideas

- **Consumer source filter** (Subito / Vinted / Facebook only) in FilterSheet — new capability; own phase (reconfirmed D-18-44)
- **Favorites grouped by source or category folders** — flat grid locked Phase 12; folders v3+
- **FB category-specific search URLs** — add post-launch if FB supports per-category marketplace URLs for Venice/Padova
- **Pagination beyond page 1** — add when spike proves insufficient coverage
- **Automated Facebook login** — rejected; operator-managed cookies only
- **Separate Facebook-only feed views** — out of scope

</deferred>

---
*Phase: 18-facebook-marketplace-scraping*
*Context gathered: 2026-08-15*
