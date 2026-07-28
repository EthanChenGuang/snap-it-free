---
phase: 01-scraper-foundation-listing-data-model
verified: 2026-07-28T11:25:00Z
status: passed
score: 17/17 truths verified
behavior_unverified: 0
overrides_applied: 0
uat_file: 01-UAT.md
uat_completed: 2026-07-28T11:25:00Z
human_verification_resolved: true
---

# Phase 1: Scraper Foundation & Listing Data Model Verification Report

**Phase Goal:** As a solo operator, I want to continuously ingest and normalize Subito.it free listings into a zone-tagged Supabase store, so that Phase 2 launches with real map pins instead of an empty feed.
**Verified:** 2026-07-28T09:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### User Flow Coverage (MVP Mode)

| Step | User story clause | Expected | Evidence | Status |
|------|-------------------|----------|----------|--------|
| 1 | continuously ingest | Worker crawls all Veneto regalo category URLs on 90-minute schedule | `worker.ts` setInterval 90×60×1000 with overlap guard; `categories.ts` has 3 URLs; `crawler.ts` runs PlaywrightCrawler with proxy | ✓ VERIFIED (code) |
| 2 | normalize … into store | Raw listings pass normalizeRawListing → Zod → persistListing upsert | `persistBatch` loops normalize + persist; `schema.ts` CanonicalListingSchema; 39 Vitest tests pass | ✓ VERIFIED |
| 3 | zone-tagged | Turf point-in-polygon assigns venice_zone at ingestion | `zone-tag.ts` + 3 GeoJSON files; wired in `normalize.ts`; zone-tag.test.ts green | ✓ VERIFIED |
| 4 | free listings only | Price/negotiation language rejected before listings table | `free-filter.ts` PRICE_PATTERNS; `logReject` → scrape_rejects; normalize.test.ts covers title+description | ✓ VERIFIED |
| 5 | Supabase store (outcome: real map pins) | Live rows in Postgres/PostGIS with source=subito | persist.ts upsert onConflict source,external_id; migrations committed; **no .env / no live run** | ⚠️ human_needed |
| 6 | operator safety net | Alert on soft-block; no silent corrupt batch | validateBatch gate; worker returns before persistBatch on failure; notify.ts UI-SPEC copy unit-tested | ✓ VERIFIED (code); live alert human_needed |

**Outcome clause (`Phase 2 launches with real map pins`):** Pipeline code complete and tested; live Supabase population unverified pending operator credentials and deploy.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PostGIS extension and listings/audit tables defined with enums and indexes (D-11) | ✓ VERIFIED | `001_enable_postgis.sql`, `002_listings_schema.sql`, `003_scrape_audit_tables.sql` — listing_source, venice_zone enums, GiST geom index, partial active indexes |
| 2 | Tables exist in live Supabase (applied migrations) | ? human_needed | SQL in repo only; no SUPABASE credentials to query dashboard |
| 3 | scraper/ Vitest Wave 0+ suite green | ✓ VERIFIED | `npx vitest run --reporter=dot` → 8 files, 39 tests, exit 0 |
| 4 | Legal note documents robots.txt risk and fallback plan (D-22) | ✓ VERIFIED | `docs/legal/subito-scraping-note.md` — robots.txt citation, fallback supply, go-live checklist |
| 5 | Live Subito spike documents selectors before extract lock (D-23) | ✓ VERIFIED | `SPIKE-NOTES.md` — card/detail selectors, pagination strategy, anti-bot signals |
| 6 | Fetch layer (Crawlee) separate from DOM extraction (D-05) | ✓ VERIFIED | `crawler.ts` imports crawlee only; `extract.ts` imports playwright Page only — zero cross-imports |
| 7 | Canonical schema with source badge and Zod gate (SCRP-02) | ✓ VERIFIED | `schema.ts` enums match migration; `schema.test.ts` parse gate; persist upsert fields |
| 8 | Zone tagging at ingestion via Turf (SCRP-03) | ✓ VERIFIED | `normalizeRawListing` calls `tagZone`; 3 GeoJSON polygons; zone-tag.test.ts all zones |
| 9 | Price/negotiation listings filtered; rejects auditable (SCRP-05) | ✓ VERIFIED | `isMislabeledFree` scans title+description; `logReject` inserts scrape_rejects; normalize.test.ts |
| 10 | expires_at = posted_at + 48h at normalization (D-12) | ✓ VERIFIED | `normalize.ts` line 16; asserted in normalize.test.ts |
| 11 | Municipality centroid fallback before zone tag (D-16) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `resolveCoords` + `municipality-centroids.json` wired in extract.ts; no test for centroid path |
| 12 | Batch validation gate aborts persist on soft-block (SCRP-06) | ✓ VERIFIED | `validate-run.ts` + 4 unit tests; worker returns before `persistBatch` when `!validation.ok` |
| 13 | Failed batch persists zero listing mutations at runtime (D-20) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Code path correct (early return); no integration test against Supabase |
| 14 | Operator alert copy matches UI-SPEC (D-21) | ✓ VERIFIED | `notify.ts` subject/opening/metrics/actions match `01-UI-SPEC.md`; notify.test.ts green |
| 15 | 90-minute cron crawls all category URLs (SCRP-01) | ✓ VERIFIED | `CRON_ENABLED` + setInterval 90min; `SUBITO_CATEGORY_URLS` spread to crawler |
| 16 | Worker deployable via Dockerfile (D-01) | ✓ VERIFIED | `Dockerfile` node:22-slim, playwright deps, CMD worker; README deploy notes |
| 17 | Live Subito → Supabase end-to-end upsert | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | persist.test mocks client; scraper/.env missing; cannot run worker against live DB |

**Score:** 13/17 truths verified (3 present, behavior-unverified; 1 human-only infrastructure check)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `supabase/migrations/002_listings_schema.sql` | Canonical listings table | ✓ VERIFIED | 28 lines; unique (source, external_id); enums |
| `supabase/migrations/003_scrape_audit_tables.sql` | scrape_runs + scrape_rejects | ✓ VERIFIED | Status check constraint; FK on rejects |
| `scraper/vitest.config.ts` | Vitest runner | ✓ VERIFIED | Present; 39 tests pass |
| `docs/legal/subito-scraping-note.md` | D-22 legal posture | ✓ VERIFIED | Non-empty; robots.txt + fallback |
| `scraper/src/subito/extract.ts` | DOM parsing isolated | ✓ VERIFIED | 264 lines; exports extractListingsFromPage |
| `scraper/src/shared/persist.ts` | Service-role upsert | ✓ VERIFIED | upsert + logReject + persistBatch |
| `scraper/src/worker.ts` | Production entrypoint | ✓ VERIFIED | runScrape lifecycle, cron, validation gate |
| `scraper/src/shared/normalize.ts` | Filter + zone + Zod | ✓ VERIFIED | Full pipeline exported |
| `scraper/src/geo/*.geojson` | Three zone polygons | ✓ VERIFIED | centro_storico, mestre_marghera, lido_murano |
| `scraper/src/shared/validate-run.ts` | Batch gate | ✓ VERIFIED | Count + selector rate thresholds |
| `scraper/src/alert/notify.ts` | Operator notifications | ✓ VERIFIED | Resend/Telegram; UI-SPEC strings |
| `scraper/Dockerfile` | Container deploy | ✓ VERIFIED | Playwright + worker CMD |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `schema.test.ts` | `schema.ts` | CanonicalListingSchema.parse() | ✓ WIRED | Import + parse in tests |
| `002_listings_schema.sql` | `schema.ts` | Matching enums | ✓ WIRED | subito/facebook/ugc; three venice zones |
| `crawler.ts` | `extract.ts` | extractListingsFromPage(page) | ✓ WIRED | requestHandler line 38 |
| `persist.ts` | `listings` table | upsert onConflict source,external_id | ✓ WIRED | geom WKT SRID=4326 |
| `normalize.ts` | `zone-tag.ts` | tagZone(lat, lng, loadZonePolygons()) | ✓ WIRED | Module init loads polygons |
| `persist.ts` | `scrape_rejects` | logReject on normalize reject | ✓ WIRED | persistBatch reject branch |
| `worker.ts` | `validate-run.ts` | validateBatch before persistBatch | ✓ WIRED | Early return on failure line 129–150 |
| `worker.ts` | `notify.ts` | notifyOperator on validation failure | ✓ WIRED | Called with parsed failureCode |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `worker.ts` | rawListings | runSubitoCrawler → live Subito DOM | Yes at runtime | ⚠️ STATIC in verify env (no live crawl run) |
| `persistBatch` | CanonicalListing | normalizeRawListing(raw) | Derived from raw | ✓ FLOWING (unit tests) |
| `persistListing` | row.geom | listing.lat/lng | WKT when coords present | ✓ FLOWING (persist.test.ts) |
| `getTrailingMedians` | trailingMedians | scrape_runs query | DB-dependent | ? human_needed (no live DB) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full unit suite | `cd scraper && npx vitest run --reporter=dot` | 8 files, 39 passed, exit 0 | ✓ PASS |
| validateBatch thresholds | `npx vitest run src/shared/validate-run.test.ts` | 4/4 passed | ✓ PASS |
| Free filter + expires_at | `npx vitest run src/shared/normalize.test.ts` | 9/9 passed | ✓ PASS |
| Persist dedupe skip | `npx vitest run src/shared/persist.test.ts` | 4/4 passed | ✓ PASS |
| Alert UI-SPEC copy | `npx vitest run src/alert/notify.test.ts` | 4/4 passed | ✓ PASS |
| Live worker E2E | `node --import tsx src/worker.ts` | Skipped — Missing SUPABASE_URL | ? SKIP |

### Probe Execution

Step 7c: SKIPPED — no probe scripts declared in phase plans; not a migration/tooling probe phase.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| SCRP-01 | 01-02, 01-04 | 1–2 hour refresh cadence, Veneto regalo crawl | ⚠️ NEEDS HUMAN | Code: 90min cron, 3 category URLs, proxy in crawler; live deploy unverified |
| SCRP-02 | 01-01, 01-02, 01-03 | Canonical schema with source badge | ✓ SATISFIED | schema.ts + migrations + persist upsert + Zod gate tests |
| SCRP-03 | 01-01, 01-03 | Zone tags at ingestion via point-in-polygon | ✓ SATISFIED | zone-tag.ts, GeoJSON, normalize integration, tests |
| SCRP-05 | 01-01, 01-03 | Filter mislabeled free listings | ✓ SATISFIED | free-filter.ts, scrape_rejects audit, normalize tests |
| SCRP-06 | 01-01, 01-04 | Validate output; alert on soft-block | ✓ SATISFIED (code) | validate-run.ts, notify.ts, worker gate; live alert delivery human |

**Orphaned requirements:** None — all five phase requirement IDs appear in plan frontmatter.

**Out of scope (deferred):** SCRP-04 (48h auto-expire display) mapped to Phase 2 in REQUIREMENTS.md — not a Phase 1 gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `SPIKE-NOTES.md` | 30 | "placeholder" (DOM documentation) | ℹ️ Info | Describes Subito card placeholder images, not code stub |

No TBD/FIXME/XXX debt markers in phase-modified source files.

### Human Verification Required

#### 1. Apply Supabase migrations

**Test:** Run `001_enable_postgis.sql`, `002_listings_schema.sql`, `003_scrape_audit_tables.sql` against operator Supabase project.
**Expected:** Tables `listings`, `scrape_runs`, `scrape_rejects` visible; PostGIS enabled; enums match TypeScript schema.
**Why human:** Migration files verified in git; live apply requires operator dashboard or CLI with project credentials.

#### 2. Live end-to-end worker run

**Test:** Copy `scraper/.env.example` → `.env`, set Supabase + optional proxy, run `CRON_ENABLED=false node --import tsx src/worker.ts`.
**Expected:** ≥1 `source=subito` row in listings with content_hash, external_url, expires_at; scrape_runs success row.
**Why human:** Verifier environment has no `scraper/.env`; config.ts throws on missing SUPABASE_URL.

#### 3. Soft-block alert delivery

**Test:** Set alerting env vars; force validateBatch failure (e.g. temporarily raise SCRAPE_MIN_COUNT_RATIO); run worker.
**Expected:** Email/Telegram with subject `[ALERT] 手慢无 scraper soft-block — run {run_id} failed validation`; zero new listing rows for that run.
**Why human:** Plan 04 blocking checkpoint explicitly deferred; unit tests mock Resend/Telegram APIs.

#### 4. Production cadence (SCRP-01 outcome)

**Test:** Deploy Docker image with CRON_ENABLED=true; monitor for 2+ hours.
**Expected:** Repeated successful scrape_runs; new/updated listings within 1–2 hour window.
**Why human:** Sustained scheduled ingestion requires deployed worker + proxy + Supabase — not runnable in verify sandbox.

### Gaps Summary

No implementation gaps found. All planned artifacts exist, are substantive, and are wired. Phase 1 code deliverables are complete.

Remaining work is **operator verification**: apply migrations, configure credentials, confirm live persist and alert delivery, and deploy the cron worker. These are classified as `human_needed`, not `gaps_found`, because the codebase implements the full pipeline and passes 39 automated tests.

---

_Verified: 2026-07-28T09:30:00Z_
_Verifier: Claude (gsd-verifier)_
