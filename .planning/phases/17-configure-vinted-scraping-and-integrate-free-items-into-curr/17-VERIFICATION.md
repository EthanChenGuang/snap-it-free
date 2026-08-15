---
phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr
verified: 2026-08-15T14:22:00Z
status: automated-pass-pending-uat
score: 37/37 decisions mapped
automated_gates: green
human_uat: pending
spike_verdict: PASS
---

# Phase 17: Vinted Scraping & Subito Category Integration — Verification Report

**Phase Goal:** Configure Vinted scraping and integrate free (€0) Vinted listings into the existing Subito canonical category system. Venice + Padova scope. Mixed feed. Admin parity with Subito.

**Verified (automated):** 2026-08-15T14:22:00Z  
**Status:** Automated phase gate **PASS** — human UAT pending (Task 2 checkpoint)

## Spike Reference (D-17-36)

| Artifact | Verdict | Evidence |
|----------|---------|----------|
| `17-SPIKE-VINTED-CATALOG.md` | **PASS** | Session-warmed `/api/v2/catalog/items` on 3 live URLs; field map + enrichment sample documented |
| `scraper/scripts/spike-vinted-catalog.mjs` | PASS | Wave 0 gate script (Plan 17-01) |
| Fixtures | PASS | `scraper/fixtures/vinted-catalog-api-sample.json`, `vinted-item-detail-fragment.json` |

## Goal-Backward Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Wave 0 spike PASS proves Vinted session-warmed `/api/v2/catalog/items` extract on 3 live URLs | ✓ VERIFIED | `17-SPIKE-VINTED-CATALOG.md` Verdict: PASS; Plan 17-01-SUMMARY |
| 2 | €0-only Vinted listings persist as `source=vinted` and appear in mixed chronological feed | ✓ VERIFIED (automated) | `scraper/src/vinted/filters.test.ts`, `normalize.test.ts`, `lib/listings/queries.test.ts` (D-17-25); human UAT pending for live feed |
| 3 | Category filters match Vinted listings via canonical Subito slugs (FilterSheet unchanged) | ✓ VERIFIED | `resolveCanonicalCategorySlug` vinted branch; `canonical-categories.test.ts`; FilterSheet grep: no source filter |
| 4 | Admin `/admin/sources/vinted` mirrors Subito matrix UI; source live but disabled by default | ✓ VERIFIED (automated) | Migration `029_vinted_source_live_seed.sql`; `VintedUrlMatrix.tsx`, `SourceDetailClient.tsx`; human UAT pending |
| 5 | Grid cards show FREE badge + Vinted source chip; detail opens external_url on vinted.it | ✓ VERIFIED (automated) | `ListListingCard.tsx`; `external-url.test.ts`; human UAT pending for visual check |

## Decision Coverage Table (D-17-01 — D-17-37)

| Decision | Description | Plan | Evidence | Status |
|----------|-------------|------|----------|--------|
| D-17-01 | €0 price only qualifies free | 17-02 | `scraper/src/vinted/filters.test.ts` `isFreePrice` | ✓ |
| D-17-02 | Reject missing/ambiguous price | 17-02 | `filters.test.ts` missing-price cases | ✓ |
| D-17-03 | Admin-configured catalog URLs only | 17-05 | `lib/admin/url-validate.ts` catalog path; `url-validate.test.ts` | ✓ |
| D-17-04 | Reject non-free at extract (`not_free`) | 17-02 | `normalize.test.ts` not_free | ✓ |
| D-17-05 | Venice + Padova parity (2 cities × 17 slugs) | 17-05 | `vinted-recommended-seed.test.ts` count 34 | ✓ |
| D-17-06 | City intent via URL metadata (`?city=`) | 17-05 | `vinted-recommended-seed.ts` header + test | ✓ |
| D-17-07 | Require coords OR resolvable city | 17-02/03 | `enrich.ts` seller location; schema city fields | ✓ |
| D-17-08 | Mirror Subito zone tagging | 17-03 | `zone-tag.ts` in normalize path | ✓ |
| D-17-09 | Seed default URL templates on live flip | 17-05 | `029_vinted_source_live_seed.sql` | ✓ |
| D-17-10 | URL template + JSON city validation | 17-03 | `enrich.ts` `matchesCityIntent` | ✓ |
| D-17-11 | Reject coords outside Venice/Padova bbox | 17-02 | `schema.test.ts` bbox superRefine | ✓ |
| D-17-12 | Municipality centroid fallback | 17-03 | `enrich.ts` centroid resolution | ✓ |
| D-17-13 | Prefer pickup location over seller city | 17-03 | `enrich.ts` `fetchSellerLocation` | ✓ |
| D-17-14 | Separate Venice vs Padova URL sets | 17-05 | `VINTED_SEED_CITY_SLUGS` venezia/padova | ✓ |
| D-17-15 | Reject shipping-only listings | 17-03 | `enrich.test.ts` shipping_only | ✓ |
| D-17-16 | Hybrid Vinted catalog_id → slug map + inference | 17-04 | `vinted-category-map.ts`, `normalizeVintedRawListing` | ✓ |
| D-17-17 | Extend `resolveCanonicalCategorySlug` vinted branch | 17-04 | `canonical-categories.ts:84-85` | ✓ |
| D-17-18 | Unmapped → null (not usato) | 17-04 | `canonical-categories.test.ts` null cases | ✓ |
| D-17-19 | One URL per slug × city (34 matrix) | 17-05 | `RECOMMENDED_VINTED_SEED_URLS.length === 34` | ✓ |
| D-17-20 | Document Vinted→Subito table + tests | 17-04 | `vinted-category-map.ts` + tests | ✓ |
| D-17-21 | No FilterSheet UI changes | 17-04/06 | FilterSheet grep: zero source filter matches | ✓ |
| D-17-22 | Same auto-translate pipeline as Subito | 17-02 | `persist.test.ts` translateBatch enqueue | ✓ |
| D-17-23 | Add `vinted` to ListingSource enum | 17-02 | `028_listing_source_vinted.sql`, `schema.ts:4` | ✓ |
| D-17-24 | Many Vinted cats → one Subito slug OK | 17-04 | `VINTED_CATALOG_TO_SUBITO_SLUG` many-to-one | ✓ |
| D-17-25 | Mixed chronological feed | 17-02/06 | `queries.test.ts` vinted row in feed | ✓ |
| D-17-26 | Small source badge on grid card | 17-06 | `ListListingCard.tsx` `#f1f1f0` chip | ✓ |
| D-17-27 | No consumer source filter | 17-06 | FilterSheet unchanged (deferred) | ✓ |
| D-17-28 | Detail opens external_url new tab | 17-06 | `external-url.ts` vinted.it allowlist | ✓ |
| D-17-29 | FREE badge on €0 Vinted cards | 17-06 | `ListListingCard.tsx` FREE span not source-gated | ✓ |
| D-17-30 | Favorites work identically | 17-06 | `favorites-compat.test.ts` | ✓ |
| D-17-31 | Feed search includes Vinted titles | 17-06 | `feed-search.test.ts` | ✓ |
| D-17-32 | Reuse Subito HttpCrawler pattern in `vinted/` | 17-03 | `scraper/src/vinted/crawler.ts`, `worker.ts:389` | ✓ |
| D-17-33 | Share global `proxy_enc` + fallback | 17-03 | `worker-proxy-gate.test.ts`, `runVintedCrawlWithProxyFallback` | ✓ |
| D-17-34 | Live status, enabled=false default | 17-05 | `029_vinted_source_live_seed.sql` | ✓ |
| D-17-35 | Default crawl interval 90 min | 17-05 | Migration `crawl_interval_minutes=90` | ✓ |
| D-17-36 | Wave 0 spike required before waves | 17-01 | `17-SPIKE-VINTED-CATALOG.md` PASS | ✓ |
| D-17-37 | Mirror Subito admin source detail UI | 17-05 | `VintedUrlMatrix.tsx`, `SourceDetailClient.tsx` | ✓ |

## Requirement Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| SCRP-E01 | Vinted HTTP/JSON catalog extract | ✓ | Wave 0 spike + `http-extract.test.ts` |
| SCRP-E02 | €0 filter at extract | ✓ | `filters.test.ts` |
| SCRP-E03 | Admin URL scope only | ✓ | `url-validate.ts` |
| SCRP-E04 | Incremental early-stop crawl | ✓ | `crawler.ts` + `early-stop.test.ts` pattern |
| SCRP-E05 | Proxy config + degraded fallback | ✓ | `worker-proxy-gate.test.ts`, D-17-33 |
| SCRP-E06 | Block retry Playwright fallback | ✓ | `crawler.ts` block retry path |
| SCRP-E07 | Batch validation thresholds | ✓ | Vinted `validateBatchHttp` minCountRatio 0 |
| SCRP-E08 | Sparse €0 yield acceptable | ✓ | `17-SPIKE` 0 €0 sample documented; incremental gate 0 |
| CAT-01 | `resolveCanonicalCategorySlug` vinted branch | ✓ | `canonical-categories.test.ts` |
| CAT-03 | Vinted→Subito map coverage tests | ✓ | `vinted-category-map` + canonical tests |
| CARD-03 | FREE badge on grid cards | ✓ | `ListListingCard.tsx` |

## Security Closeout

| Threat ID | Category | Mitigation | Status | Evidence |
|-----------|----------|------------|--------|----------|
| T-17-SSRF | SSRF | Admin URLs restricted to `vinted.it/catalog/{id}` path | ✓ CLOSED | `url-validate.test.ts` rejects non-catalog paths |
| T-17-04 | Tampering | Host allowlist on normalize + external URL | ✓ CLOSED | `normalize.ts` vinted.it check; `external-url.ts` |
| T-17-16 | Repudiation | Decision table + UAT checkpoint | ⚠️ PARTIAL | This doc + pending human UAT |
| T-17-17 | Info disclosure | No credentials in verification doc | ✓ ACCEPT | No secrets recorded |
| T-17-SC | Tampering (npm) | Phase gate confirms no unauthorized packages | ✓ CLOSED | No new deps in Phase 17 plans |

## Grep Audit Results

| Check | Command / Location | Result |
|-------|-------------------|--------|
| `resolveCanonicalCategorySlug` vinted branch | `canonical-categories.ts:84` | ✓ Present |
| Worker vinted branch | `worker.ts:389` | ✓ Present |
| FilterSheet no source filter | grep FilterSheet source | ✓ Zero matches |
| external-url vinted.it | `external-url.ts:4-5` | ✓ Allowlisted |
| RECOMMENDED_VINTED_SEED_URLS count | `vinted-recommended-seed.test.ts` | ✓ 34 URLs |
| listing_source vinted in schema | `028_listing_source_vinted.sql`, `schema.ts` | ✓ Present |

## Automated Test Sign-Off

| Suite | Command | Result | Date |
|-------|---------|--------|------|
| Lib tests | `npm run test:lib` | **416/416 pass**, exit 0 | 2026-08-15 |
| Scraper tests | `cd scraper && npm test` | **183/183 pass**, exit 0 | 2026-08-15 |

## Operator Runbook Note (Low €0 Yield)

Vinted is a paid marketplace — **zero €0 listings in a crawl run is expected and not a phase failure** when the crawl succeeds with high `not_free` reject counts. Wave 0 spike documented 0 €0 items across all 3 sample URLs. Operator should verify extract path + reject metrics, not raw free-item count, on first manual run (17-RESEARCH pitfall 1).

## Human UAT (Pending — Task 2)

| Step | Check | Status |
|------|-------|--------|
| 1 | Migrations 024+025 (028/029) applied | ⬜ pending |
| 2 | `/admin/sources/vinted` — live, disabled, 34 URL matrix | ⬜ pending |
| 3 | Enable source + manual run | ⬜ pending |
| 4 | Mixed feed shows Vinted listing with Subito | ⬜ pending |
| 5 | Grid card: FREE badge + Vinted chip (Stitch monochrome) | ⬜ pending |
| 6 | Detail external link opens vinted.it new tab | ⬜ pending |
| 7 | Category filter matches Vinted listing | ⬜ pending |
| 8 | FilterSheet has no source-only filter (D-17-27) | ⬜ pending |

**Resume signal:** Type "approved" when UAT passes or list gaps.

## Deviations During Automated Gate

### Auto-fixed Issues

**1. [Rule 3 - Blocking] url-validate.test.ts outdated after italian-cities expansion**
- **Found during:** Task 1 test suite
- **Issue:** Test expected Milano regalo URL rejection; quick task 260815-fjs expanded supported cities
- **Fix:** Updated test to accept Milano and reject malformed paths instead
- **Files:** `lib/admin/url-validate.test.ts`

**2. [Rule 3 - Blocking] scraper vitest missing `@/` alias**
- **Found during:** Task 1 scraper suite
- **Issue:** `translate/ingest.test.ts` failed loading `@/lib/geo/italian-cities` via `subito-regalo-catalog.ts`
- **Fix:** Added `resolve.alias` to `scraper/vitest.config.ts`
- **Files:** `scraper/vitest.config.ts`
