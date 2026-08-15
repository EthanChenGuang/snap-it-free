---
phase: 18-facebook-marketplace-scraping
verified: 2026-08-15T17:00:00Z
status: passed-with-deferred
score: 4/5 must-haves verified (Wave 0 live extract deferred)
behavior_unverified: 1
overrides_applied: 1
human_uat: deferred-approved
human_uat_at: "2026-08-15T17:06:00Z"
human_uat_note: "Autonomous gate — operator session/crawl deferred; static + DB seed checks green"
wave_0_verdict: FAIL
wave_0_scaffold_approved: true
wave_0_scaffold_approved_at: "2026-08-15"
re_verification: false
---

# Phase 18: Facebook Marketplace Scraping & Source Configuration — Verification Report

**Phase Goal:** Configure Facebook Marketplace as a logged-in scraped source with free-listing gates, admin session upload, mixed chronological feed, and Subito canonical category mapping.

**Verified:** 2026-08-15T17:00:00Z  
**Status:** `passed-with-deferred` — automated suite green + scaffold approved; live Wave 0 extract and operator UAT deferred  
**Automation:** `scripts/phase18-uat-automation.mjs`

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Wave 0 spike proves Playwright + GraphQL extract on live Venice URLs with session + proxy | ⚠️ DEFERRED | `18-SPIKE-FACEBOOK-MARKETPLACE.md` **Verdict: FAIL** — `FB_SESSION_JSON` missing; user approved scaffold continuation (STATE decision); fixtures + unit tests cover CI path |
| 2 | Free Facebook listings persist as `source=facebook` and appear in mixed chronological feed | ✓ VERIFIED | `scraper/src/facebook/filters.test.ts`; `lib/listings/queries.test.ts` mixed feed; UAT script mixed feed seed |
| 3 | Category filters match FB listings via canonical Subito slugs (FilterSheet unchanged) | ✓ VERIFIED | `lib/listings/canonical-categories.ts:90-94`; `facebook-category-map.ts`; FilterSheet zero source-filter matches |
| 4 | Admin `/admin/sources/facebook` mirrors Subito matrix UI; session upload + test; live/disabled default | ✓ VERIFIED | `030_facebook_session_enc.sql`; `SourceDetailClient.tsx` isFacebook branch; `FacebookUrlMatrix.tsx`; session encrypt API |
| 5 | Grid cards show FREE badge + Facebook chip; detail opens facebook.com marketplace URL | ✓ VERIFIED | `ListListingCard.tsx`; `app/listing/[id]/page.tsx` → `ScrapedListingShell`; `external-url.ts` allowlist |

**Score:** 4/5 truths verified (1 deferred — live Wave 0 + operator crawl)

### Wave 0 Gate (D-18-19 / D-18-20)

| Check | Required | Result |
|-------|----------|--------|
| Spike artifact present | Yes | ✓ `18-SPIKE-FACEBOOK-MARKETPLACE.md` |
| Live Verdict: PASS | Hard gate per D-18-19 | ✗ **FAIL** — `FB_SESSION_JSON missing or path not found` |
| Fixtures + unit tests for CI | Scaffold path | ✓ `facebook-search-graphql-sample.json`; `graphql-extract.test.ts`, `filters.test.ts`, `session.test.ts` |
| User scaffold approval | Override D-18-20 hard stop | ✓ STATE: "proceed with Facebook Wave 0 scaffold despite live Verdict FAIL" |
| Production enablement | Block until live PASS | ⚠️ Keep `enabled=false`; operator must run spike before prod crawl |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| SCRP-E01 | 18-01, 18-02, 18-03 | GraphQL card extract | ✓ SATISFIED (CI) | `graphql-extract.test.ts`; live spike DEFERRED |
| SCRP-E02 | 18-03 | Incremental known-set + early-stop | ✓ SATISFIED | `crawler.ts` + `early-stop.test.ts` reuse |
| SCRP-E03 | 18-03 | Full refresh disables early-stop | ✓ SATISFIED | `decideCrawlMode` passed to facebook crawler |
| SCRP-E04 | 18-03 | Playwright primary path | ✓ SATISFIED | `scraper/src/facebook/crawler.ts` PlaywrightCrawler |
| SCRP-E05 | 18-03 | Proxy required (no direct default) | ✓ SATISFIED | `worker.ts` facebook branch proxy gate |
| SCRP-E06 | 18-03 | Crawlee Playwright stack | ✓ SATISFIED | `facebook/crawler.ts` |
| SCRP-E07 | 18-03 | Crawl vs persist skip metrics | ✓ SATISFIED | Worker finish path parity with Subito/Vinted |
| SCRP-E08 | 18-02, 18-03 | Sparse batch validation | ✓ SATISFIED | `validate-run.test.ts` facebook zero floor |
| CAT-01 | 18-04 | `resolveCanonicalCategorySlug` facebook branch | ✓ SATISFIED | `canonical-categories.ts:90-94` |
| CAT-03 | 18-04 | FB category map + tests | ✓ SATISFIED | `facebook-category-map.ts` + tests |
| CARD-03 | 18-06 | FREE badge on grid cards | ✓ SATISFIED | `ListListingCard.tsx` — not source-gated |
| I18N-01 (partial) | 18-06 | `sourceFacebook` in en/it/zh | ✓ SATISFIED | `messages/en.ts`, `it.ts`, `zh.ts` |

### Security Closeout (STRIDE)

| Threat ID | Mitigation | Status | Evidence |
|-----------|------------|--------|----------|
| T-18-SessionUpload | GET never returns decrypted session; encrypt at rest | ✓ CLOSED | `crypto.ts` encryptSession; API PATCH only; `queries.ts` sessionConfigured boolean |
| T-18-SSRF | Admin URLs restricted to marketplace search paths | ✓ CLOSED | `url-validate.ts` FACEBOOK_MARKETPLACE_SEARCH_REGEX; `url-validate.test.ts` |
| T-18-Crypto | AES-256-GCM session_enc same pattern as proxy_enc | ✓ CLOSED | `crypto.test.ts` encryptSession roundtrip |
| T-18-UAT | Human sign-off in VERIFICATION | ⚠️ DEFERRED | Operator session/proxy/crawl UAT pending |

### Human UAT (Deferred — Autonomous Gate Approved)

**Gate decision:** Autonomous execution — operator session/proxy/crawl UAT deferred per user instruction (Wave 0 FAIL scaffold approved). Static contracts, unit tests, and DB seed mixed-feed check green.

**Operator prerequisites (before production enablement):** `SCRAPER_SECRETS_KEY`, `FB_SESSION_JSON`, `PROXY_URL`, migration 030 applied.

| Step | Check | Status |
|------|-------|--------|
| 1 | `/admin/sources/facebook` — paste session, Test session, Save | ⏸ DEFERRED |
| 2 | Proxy configured in admin global settings | ⏸ DEFERRED |
| 3 | Enable facebook + manual run | ⏸ DEFERRED |
| 4 | Run completes or `session_expired` fails visibly | ⏸ DEFERRED |
| 5 | Mixed feed shows FB + Subito/Vinted chronologically | ✓ PARTIAL (automation script DB seed PASS) |
| 6 | FREE badge + Facebook chip; detail opens facebook.com | ✓ PARTIAL (component + external-url tests PASS) |
| 7 | Category filter matches mapped FB listing | ⏸ DEFERRED |
| 8 | Padova URL first manual run retains padova slug (D-18-30) | ⏸ DEFERRED |
| 9 | FilterSheet has no source filter (D-18-44) | ✓ VERIFIED (static grep + git diff gate) |
| 10 | Decision audit complete | ✓ VERIFIED (this document) |

### Padova Manual Run Checklist (D-18-30)

- [ ] Enable facebook source after session + proxy configured
- [ ] Trigger manual run including Padova seed URLs from migration 030
- [ ] Confirm listings get `city=padova` or bbox-valid coords (not Venice fallback)
- [ ] Confirm crawl URL retains `/marketplace/padova/` slug in run logs

### Decision Audit (D-18-01 — D-18-63)

| ID | Plan | Evidence file / test | Status |
|----|------|---------------------|--------|
| D-18-01 | 18-02 | `scraper/src/facebook/filters.test.ts` price-field-only gate | ✓ |
| D-18-02 | 18-02 | `filters.test.ts` structured zero + Free/Gratis tokens | ✓ |
| D-18-03 | 18-02 | `filters.test.ts` reject missing/ambiguous price | ✓ |
| D-18-04 | 18-03 | `filters.test.ts` + `enrich.ts` shipping-only reject | ✓ |
| D-18-05 | 18-01 | Spike doc + `session.test.ts` login-wall classify | ⚠️ live deferred |
| D-18-06 | 18-05 | `SourceDetailClient.tsx` operator session paste | ✓ |
| D-18-07 | 18-01 | `crawler.ts` Playwright + GraphQL intercept | ✓ |
| D-18-08 | 18-03 | `worker.ts` facebook proxy required, no direct fallback | ✓ |
| D-18-09 | 18-03 | `session.test.ts` + worker session_expired fail-fast | ✓ |
| D-18-10 | 18-05 | Admin session field + Test session button | ✓ |
| D-18-11 | 18-02 | `030_facebook_session_enc.sql`; `crypto.test.ts` | ✓ |
| D-18-12 | 18-03 | `session.ts` pre-flight probe before crawl | ✓ |
| D-18-13 | 18-03 | `crawler.ts` concurrency 1 sequential URLs | ✓ |
| D-18-14 | 18-02 | `030_facebook_session_enc.sql` anti_block_preset conservative | ✓ |
| D-18-15 | 18-03 | `crawler.ts` search cards first, detail fallback cap | ✓ |
| D-18-16 | 18-03 | `crawler.ts` detail visit cap (~10%) | ✓ |
| D-18-17 | 18-03 | `crawler.ts` page 1 only (no pagination) | ✓ |
| D-18-18 | 18-03 | `crawler.ts` loadKnownListingSet + early-stop | ✓ |
| D-18-19 | 18-01 | `18-SPIKE-FACEBOOK-MARKETPLACE.md` | ⚠️ FAIL deferred |
| D-18-20 | 18-01 | Scaffold approved override; `enabled=false` default | ⚠️ override |
| D-18-21 | 18-05 | `facebook-recommended-seed.ts` Venice + Padova | ✓ |
| D-18-22 | 18-05 | `facebook-recommended-seed.test.ts` 6 URLs | ✓ |
| D-18-23 | 18-02 | `030_facebook_session_enc.sql` 6-URL UPDATE | ✓ |
| D-18-24 | 18-05 | `url-validate.test.ts` marketplace search regex | ✓ |
| D-18-25 | 18-03 | `enrich.ts` bbox reject outside Venice/Padova | ✓ |
| D-18-26 | 18-03 | `enrich.ts` prefer pickup location over profile city | ✓ |
| D-18-27 | 18-03 | `enrich.ts` municipality centroid fallback | ✓ |
| D-18-28 | 18-03 | `enrich.ts` tagZone when coords exist | ✓ |
| D-18-29 | 18-05 | Admin-configured URLs only; no site-wide search | ✓ |
| D-18-30 | 18-05 | Padova URLs in seed; manual run checklist above | ⏸ deferred |
| D-18-31 | 18-03 | `crawler.ts` dedup by external_id across URLs | ✓ |
| D-18-32 | 18-02 | Migration 030 live + enabled=false | ✓ |
| D-18-33 | 18-02 | Migration 030 interval_minutes=90 | ✓ |
| D-18-34 | 18-05 | `FacebookUrlMatrix.tsx` + session UI parity | ✓ |
| D-18-35 | 18-02, 18-06 | `normalize.ts`; `external-url.test.ts` | ✓ |
| D-18-36 | 18-02 | `scraped-listing-ttl.ts` 48h TTL parity | ✓ |
| D-18-37 | 18-03 | Shared global proxy_enc (worker reads global proxy) | ✓ |
| D-18-38 | 18-02 | No enum migration — facebook pre-exists | ✓ |
| D-18-39 | 18-03 | `auto-hide.ts` threshold unchanged at 2 | ✓ |
| D-18-40 | 18-02 | `scraper/src/facebook/` + `worker.ts` branch | ✓ |
| D-18-41 | 18-06 | `queries.test.ts` mixed chronological feed | ✓ |
| D-18-42 | 18-06 | `ListListingCard.tsx` FREE badge | ✓ |
| D-18-43 | 18-06 | `ListListingCard.tsx` monochrome Facebook chip | ✓ |
| D-18-44 | 18-06 | FilterSheet unchanged — verified absent | ✓ |
| D-18-45 | 18-06 | `listing/[id]/page.tsx` → ScrapedListingShell | ✓ |
| D-18-46 | 18-06 | `favorites-compat.test.ts` facebook UUID | ✓ |
| D-18-47 | 18-06 | `feed-search.test.ts` facebook title match | ✓ |
| D-18-48 | 18-02 | `persist.ts` translateBatch includes facebook | ✓ |
| D-18-49 | 18-04 | `facebook-category-map.ts` hybrid map + inference | ✓ |
| D-18-50 | 18-04 | `canonical-categories.ts` facebook branch | ✓ |
| D-18-51 | 18-04 | Resolver order in `resolveCanonicalCategorySlug` | ✓ |
| D-18-52 | 18-04 | Unmapped → null; excluded by category filter | ✓ |
| D-18-53 | 18-04 | Many FB categories → one Subito slug OK | ✓ |
| D-18-54 | 18-04 | `FACEBOOK_CATEGORY_TO_SLUG` + unit tests | ✓ |
| D-18-55 | 18-04 | Canonical slug persisted at scrape in normalize | ✓ |
| D-18-56 | 18-04 | `persist.ts` category refresh on hash change | ✓ |
| D-18-57 | 18-04 | Detail fallback for category within cap | ✓ |
| D-18-58 | 18-04 | Raw FB category ID in raw_payload metadata only | ✓ |
| D-18-59 | 18-04 | No category intent in search URLs | ✓ |
| D-18-60 | 18-04 | Best-effort map; null fallback tests | ✓ |
| D-18-61 | 18-04 | `canonical-categories.test.ts` stub updated | ✓ |
| D-18-62 | 18-04 | FilterSheet unchanged — slug filter path | ✓ |
| D-18-63 | 18-04 | `listingMatchesCategoryFilter` source-aware slug | ✓ |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Facebook free price filter | `cd scraper && npm test -- src/facebook/filters.test.ts` | pass | ✓ PASS |
| GraphQL extract fixtures | `cd scraper && npm test -- src/facebook/graphql-extract.test.ts` | pass | ✓ PASS |
| Session probe classify | `cd scraper && npm test -- src/facebook/session.test.ts` | pass | ✓ PASS |
| Canonical slug facebook branch | `npm run test:lib -- lib/listings/canonical-categories.test.ts` | pass | ✓ PASS |
| 6 URL seed matrix | `npm run test:lib -- lib/admin/facebook-recommended-seed.test.ts` | pass | ✓ PASS |
| External URL allowlist | `npm run test:lib -- lib/listings/external-url.test.ts` | pass | ✓ PASS |
| Phase 18 UAT automation | `node scripts/phase18-uat-automation.mjs` | pass | ✓ PASS |
| Full lib suite | `npm run test:lib` | pass | ✓ PASS |
| Full scraper suite | `cd scraper && npm test` | pass | ✓ PASS |
| Root test suite | `npm test` | pass | ✓ PASS |

### Gaps Summary

1. **Live Wave 0 extract (D-18-19):** FAIL — operator must supply `FB_SESSION_JSON` + `PROXY_URL` and re-run `scraper/scripts/spike-facebook-marketplace.mjs` before production enablement.
2. **Operator UAT (session upload, manual crawl, Padova run):** Deferred pending credentials and deployed migration 030.
3. **No code blockers** — all automated gates green; facebook remains `enabled=false` until operator completes live verification.

---

_Verified: 2026-08-15T17:00:00Z_  
_Verifier: gsd-executor (Plan 18-07 phase gate)_
