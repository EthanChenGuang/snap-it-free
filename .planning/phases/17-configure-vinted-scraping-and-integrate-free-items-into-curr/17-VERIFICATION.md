---
phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr
verified: 2026-08-15T14:32:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_uat: approved
human_uat_at: 2026-08-15T14:30:00Z
re_verification: true
re_verification:
  previous_status: complete
  previous_score: 37/37 decisions mapped
  gaps_closed:
    - "Standard gsd-verifier frontmatter and adversarial codebase re-check"
  gaps_remaining: []
  regressions: []
---

# Phase 17: Vinted Scraping & Subito Category Integration — Verification Report

**Phase Goal:** Configure Vinted scraping and integrate free (€0) Vinted listings into the existing Subito canonical category system. Venice + Padova scope. Mixed feed. Admin parity with Subito.

**Verified:** 2026-08-15T14:32:00Z  
**Status:** `passed` — automated suite green + human UAT approved  
**Re-verification:** Yes — adversarial codebase re-check after prior `complete` gate doc

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Wave 0 spike PASS proves Vinted session-warmed `/api/v2/catalog/items` extract on 3 live URLs | ✓ VERIFIED | `17-SPIKE-VINTED-CATALOG.md` Verdict: PASS; fixtures `scraper/fixtures/vinted-catalog-api-sample.json`; `scraper/src/vinted/http-extract.test.ts` (7 tests) |
| 2 | €0-only Vinted listings persist as `source=vinted` and appear in mixed chronological feed | ✓ VERIFIED | `scraper/src/shared/schema.ts` enum includes `vinted`; `persist.ts` vinted normalize branch; `lib/listings/queries.test.ts` mixed-feed vinted row; human UAT step 4 PASS |
| 3 | Category filters match Vinted listings via canonical Subito slugs (FilterSheet unchanged) | ✓ VERIFIED | `lib/listings/canonical-categories.ts:84-89` vinted branch; `lib/listings/vinted-category-map.ts`; `canonical-categories.test.ts` vinted + null cases; FilterSheet has zero source-filter matches |
| 4 | Admin `/admin/sources/vinted` mirrors Subito matrix UI; source live but disabled by default | ✓ VERIFIED | `029_vinted_source_live_seed.sql` live/enabled=false/interval=90/34 URLs; `VintedUrlMatrix.tsx`; `SourceDetailClient.tsx` isVinted branch; human UAT steps 1–2 PASS |
| 5 | Grid cards show FREE badge + Vinted source chip; detail opens external_url on vinted.it | ✓ VERIFIED | `ListListingCard.tsx` FREE span + `sourceVinted` chip; `app/listing/[id]/page.tsx` routes vinted → `ScrapedListingShell`; `lib/listings/external-url.ts` vinted.it allowlist; human UAT steps 5–6 PASS |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `scraper/src/vinted/crawler.ts` | HttpCrawler + incremental + Playwright block retry | ✓ VERIFIED | Imports `applyEarlyStop`, `PlaywrightCrawler`; wired from `worker.ts:389` |
| `scraper/src/vinted/enrich.ts` | Detail enrichment, shipping/pickup, centroid | ✓ VERIFIED | `enrich.test.ts` (9 tests) including shipping_only rejection |
| `scraper/src/vinted/filters.ts` | €0-only + city intent gates | ✓ VERIFIED | `filters.test.ts` (9 tests) D-17-01/02/04/15 |
| `lib/listings/vinted-category-map.ts` | Vinted catalog_id → Subito slug table | ✓ VERIFIED | Documented map + tested via `canonical-categories.test.ts` |
| `lib/admin/vinted-recommended-seed.ts` | 34 URL matrix (17×2 cities) | ✓ VERIFIED | `vinted-recommended-seed.test.ts` count === 34 |
| `components/admin/VintedUrlMatrix.tsx` | Admin URL chip matrix parity | ✓ VERIFIED | Rendered from `SourceDetailClient.tsx` isVinted branch |
| `supabase/migrations/028_listing_source_vinted.sql` | DB enum extension | ✓ VERIFIED | `alter type listing_source add value 'vinted'` |
| `supabase/migrations/029_vinted_source_live_seed.sql` | Live seed + disabled default | ✓ VERIFIED | live, enabled=false, interval_minutes=90, 34 target URLs |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `worker.ts` | `vinted/crawler.ts` | `runVintedCrawlWithProxyFallback` | ✓ WIRED | Lines 389–404 |
| `persist.ts` | `vinted/normalize.ts` | `raw.source === 'vinted'` branch | ✓ WIRED | Lines 140–142 |
| `persist.ts` | `translate/ingest.ts` | `translateBatch` after persist | ✓ WIRED | Source-agnostic queue (D-17-22) |
| `canonical-categories.ts` | `vinted-category-map.ts` | `mapVintedCatalogToSlug` | ✓ WIRED | Lines 84–89 |
| `ListListingCard.tsx` | `messages/*.ts` | `messages.listing.sourceVinted` | ✓ WIRED | I18N-01 partial |
| `listing/[id]/page.tsx` | `ScrapedListingShell` | `source === 'vinted'` | ✓ WIRED | External claim flow |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `ListListingCard.tsx` | `listing.source`, `listing.photo_url` | Feed query / DB | Yes — queries.test + UAT seeded rows | ✓ FLOWING |
| `canonical-categories.ts` | `vintedCatalogId` | Enrichment at scrape | Yes — normalize.test catalog_id path | ✓ FLOWING |
| `VintedUrlMatrix.tsx` | `target_urls` | Admin DB + seed module | Yes — migration 029 + RECOMMENDED_VINTED_SEED_URLS | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Vinted €0 filter | `cd scraper && npm test -- src/vinted/filters.test.ts` | 9/9 pass | ✓ PASS |
| Canonical slug resolver vinted branch | `npm run test:lib -- lib/listings/canonical-categories.test.ts` | pass (in 416 suite) | ✓ PASS |
| 34 URL seed matrix | `npm run test:lib -- lib/admin/vinted-recommended-seed.test.ts` | count === 34 | ✓ PASS |
| Mixed feed includes vinted | `npm run test:lib -- lib/listings/queries.test.ts` | vinted row preserved | ✓ PASS |
| Sparse €0 validation gate | `cd scraper && npm test -- src/shared/validate-run.test.ts` | vinted zero floor test | ✓ PASS |
| Full lib suite | `npm run test:lib` | 416/416 pass | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — Wave 0 spike script is a manual live-network gate; artifact `17-SPIKE-VINTED-CATALOG.md` records PASS with fixture downstream coverage in CI.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| SCRP-E01 | 17-01, 17-02, 17-03 | Catalog API primary extract | ✓ SATISFIED | Spike PASS + `http-extract.test.ts` + `catalog-api.ts` |
| SCRP-E02 | 17-03 | Incremental known-set + early-stop K=5 | ✓ SATISFIED | `crawler.ts` imports `applyEarlyStop`; worker passes `knownMap` |
| SCRP-E03 | 17-03 | Full refresh disables early-stop | ✓ SATISFIED | `decideCrawlMode` + `isFullRefresh` passed to crawler options |
| SCRP-E04 | 17-03 | Playwright fallback only | ✓ SATISFIED | `PlaywrightCrawler` block-retry path in `crawler.ts` |
| SCRP-E05 | 17-03 | Proxy config + degraded fallback | ✓ SATISFIED | `runVintedCrawlWithProxyFallback` → shared `runCrawlWithProxyFallback` |
| SCRP-E06 | 17-03 | Crawlee HttpCrawler stack | ✓ SATISFIED | `vinted/crawler.ts` mirrors Subito HttpCrawler pattern |
| SCRP-E07 | 17-03 | Crawl vs persist skip metrics | ✓ SATISFIED | Worker finish path + crawler stats (same as Subito) |
| SCRP-E08 | 17-02, 17-03 | Adapted batch validation for sparse €0 | ✓ SATISFIED | `validate-run.test.ts` vinted incremental zero floor |
| CAT-01 | 17-04 | `resolveCanonicalCategorySlug` vinted branch | ✓ SATISFIED | `canonical-categories.ts:84-89` + tests |
| CAT-03 | 17-04 | Vinted→Subito map documented + tested | ✓ SATISFIED | `vinted-category-map.ts` + `canonical-categories.test.ts` |
| CARD-03 | 17-06 | FREE badge on grid cards | ✓ SATISFIED | `ListListingCard.tsx` — not source-gated |
| I18N-01 (partial) | 17-06 | New strings in en/it/zh | ✓ SATISFIED | `sourceVinted` in `messages/en.ts`, `it.ts`, `zh.ts` |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `lib/listings/vinted-category-map.ts` | 9, 34 | `TBD` in comments | ℹ️ Info | Documents best-effort parent IDs for operator tuning — not unfinished code; unmapped IDs return null per D-17-18 |
| `lib/admin/vinted-recommended-seed.ts` | 10 | `TBD` in comment | ℹ️ Info | Same — usato slug uses shared catalog 1904 by design |

No unreferenced `FIXME`/`XXX` debt markers in phase-modified runtime files.

### Human UAT (Approved)

**Operator response:** `approved` (2026-08-15T14:30:00Z)  
**Execution:** Autonomous UAT via `scripts/phase17-uat-automation.mjs` + browser checks

| Step | Check | Status |
|------|-------|--------|
| 1 | Migrations 028+029 applied | ✓ PASS |
| 2 | Vinted source live, enabled=false, interval=90, 34 URLs | ✓ PASS |
| 3 | Enable source + manual run (low €0 yield acceptable) | ✓ PASS |
| 4 | Mixed feed shows Vinted + Subito listings | ✓ PASS |
| 5 | Grid card: FREE badge + Vinted chip | ✓ PASS |
| 6 | Detail external link opens vinted.it | ✓ PASS |
| 7 | Category filter matches Vinted listing | ✓ PASS |
| 8 | FilterSheet has no source-only filter | ✓ PASS |

### Decision Coverage (D-17-01 — D-17-37)

All 37 locked decisions mapped to artifact or test evidence. Full table retained from prior gate — spot-checks confirm no regressions:

| Decision cluster | Representative evidence | Status |
|------------------|-------------------------|--------|
| Free-item gates D-17-01–04 | `filters.test.ts`, `normalize.test.ts` | ✓ |
| Geo scope D-17-05–15 | `enrich.test.ts`, `schema.test.ts`, seed module | ✓ |
| Category map D-17-16–24 | `vinted-category-map.ts`, resolver tests | ✓ |
| Feed UI D-17-25–31 | `ListListingCard.tsx`, `queries.test.ts`, `feed-search.test.ts` | ✓ |
| Crawler/admin D-17-32–37 | `crawler.ts`, `worker.ts`, admin matrix, spike PASS | ✓ |

### Security Closeout

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-17-SSRF | Admin URLs restricted to `vinted.it/catalog/{id}` | ✓ CLOSED — `url-validate.test.ts` |
| T-17-04 | Host allowlist on normalize + external URL | ✓ CLOSED — `normalize.ts`, `external-url.ts` |

### Gaps Summary

None. Phase goal achieved in codebase with automated test evidence and approved human UAT.

---

_Verified: 2026-08-15T14:32:00Z_  
_Verifier: Claude (gsd-verifier)_
