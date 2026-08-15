---
phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr
plan: 01
subsystem: scraper
tags: [vinted, spike, catalog-api, fixtures]
requires:
  - phase: 15
    provides: spider-http-category spike pattern, got-scraping TLS, crawlee stack
  - phase: 16
    provides: direct vs residential proxy posture
provides:
  - Session-warmed /api/v2/catalog/items extraction proof on 3 live vinted.it URLS
  - Vinted catalog API field map (id, title, price.amount, url, photo, user.id)
  - Enrichment verification: catalog_id + shipping.type extractable via escaped-RSC regex; posted_at fallback documented
  - Sanitized catalog API + item-detail fixtures for downstream unit tests
  - Seller-location extraction from /api/v2/users/{id}
affects:
  - 17-02 (http-extract, filters, normalize use fixtures + field map)
  - 17-03 (enrich.ts reads RSC field map)
  - Edits scraper

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Session warm-up (catalog page GET) then session-authenticated /api/v2/catalog/items fetch
    - Cookie header build: skip empty-value cookies, dedupe by name (prevents 401)
    - Next.js RSC escaped-key regex for item detail fields (\"catalog_id\":N)

key-files:
  created:
    - scraper/scripts/spike-vinted-catalog.mjs
    - scraper/fixtures/vinted-catalog-api-sample.json
    - scraper/fixtures/vinted-item-detail-fragment.json
    - .planning/phases/17-configure-vinted-scraping-and-integrate-free-items-into-curr/17-SPIKE-VINTED-CATALOG.md
  modified: []

key-decisions:
  - "Wave 0 spike uses session-warmed HttpCrawler-first catalog API extract (option-a), approved by user"
  - "born Cookie header omits empty-value cookies (e.g. empty access_token_web=) and dedupes by name — otherwise API 401s"
  - "catalog_id + shipping.type extracted via escaped-RSC regex on item page (no Playwright needed for these fields)"
  - "posted_at not present in RSC payload — document scrape-run-time fallback (A3)"

patterns-established:
  - "Vinted catalog extraction: warm-up GET catalog URL → GET /api/v2/catalog/items with warmed cookies"
  - "Vinted enrichment: parse item RSC payload for catalog_id + shipping.type"

requirements-completed: [SCRP-E01, D-17-36]

coverage:
  - id: S1
    description: "spike-vinted-catalog.mjs session-warmed catalog API spike script (3 live URLs)"
    requirement: SCRP-E01
    verification:
      - kind: other
        ref: "node scraper/scripts/spike-vinted-catalog.mjs → OVERALL VERDICT: PASS, exit 0"
        status: pass
    human_judgment: false
  - id: S2
    description: "17-SPIKE-VINTED-CATALOG.md records Verdict: PASS, field map, per-URL timing, enrichment sample and gate criteria"
    requirement: D-17-36
    verification:
      - kind: other
        ref: "grep -qE 'Verdict: (PASS|FAIL)' 17-SPIKE-VINTED-CATALOG.md"
        status: pass
    human_judgment: true
    rationale: "Wave 0 is a hard gate — only a human can approve that the field map is implementation-ready and the PASS verdict is trustworthy (D-17-36)."
  - id: S3
    description: "Sanitized catalog API + item-detail fixtures for downstream unit tests"
    verification:
      - kind: other
        ref: "test -f scraper/fixtures/vinted-catalog-api-sample.json && test -f scraper/fixtures/vinted-item-detail-fragment.json"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-08-15
status: complete
---

# Phase 17 Plan 01: Wave 0 Vinted Catalog Spike Summary

**Session-warmed /api/v2/catalog/items extraction proven on 3 live vinted.it URLs with 100% field completeness, plus enrichment field map (catalog_id + shipping.type via RSC) and sanitized fixtures — verdict PASS.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-15T11:40:00Z
- **Completed:** 2026-08-15T11:48:17Z
- **Tasks:** 3 (Task 1 decision gate, Task 2 auto spike, Task 3 human-verify gate)
- **Files modified:** 4 created

## Accomplishments
- Proven session-warmed catalog API extract on 3 live URLs: 200 status, 96 items/URL, 100% field completeness (id, title, price.amount, url, photo), wall time ≤ 3s
- Confirmed required session cookie (`access_token_web`) with a robust cookie-header builder that skips empty-value cookies / dedupes (fixes the 401 the naive join caused)
- Enrichment verified: `catalog_id` + `shipping.type` ("shipping") extractable from the Next.js RSC payload via escaped-key regex; `posted_at` documented as scrape-run-time fallback (A3)
- Seller location extractable from `/api/v2/users/{id}` (city + country_title)
- Sanitized fixtures written for downstream Plan 17-02/17-03 unit tests
- Wave 0 hard gate (D-17-36) cleared with human approval

## Task Commits

1. **Tasks 1–2: Spike script + fixtures** - `c9b75c3` (feat/17-01)
2. **Task 2: Spike verdict artifact** - `84f9ffa` (docs/17-01)

**Plan metadata:** SUMMARY committed separately (docs/17-01)

## Files Created/Modified
- `scraper/scripts/spike-vinted-catalog.mjs` - Wave 0 spike: session warm-up + catalog API extract, enrichment, seller location, PASS/FAIL artifact + fixtures writer
- `scraper/fixtures/vinted-catalog-api-sample.json` - sanitized API fragment (first 3 items) for Plan 17-02 http-extract tests
- `scraper/fixtures/vinted-item-detail-fragment.json` - sanitized RSC enrichment fragment (catalog_id, shipping.type, posted_at fallback) for Plan 17-03 enrich tests
- `.planning/phases/17-configure-vinted-scraping-and-integrate-free-items-into-curr/17-SPIKE-VINTED-CATALOG.md` - PASS verdict, field map, timing, enrichment + seller location samples, gate criteria

## Decisions Made
- Wave 0 spike uses **session-warmed HttpCrawler-first catalog API extract** (option-a), user-approved via decision gate
- Cookie header builder skips empty-value cookies and dedupes by name — this was the root fix for the initial 401 (a naive `; `-join of raw set-cookie included an empty `access_token_web=` pair)
- `catalog_id` + `shipping.type` extracted via escaped-RSC regex (no Playwright required for these two fields)
- `posted_at` documented as scrape-run-time fallback — confirmed absent from the item RSC payload (A3)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 401 on catalog API due to malformed cookie header**
- **Found during:** Task 2 (spike run)
- **Issue:** The initial `buildCookieHeader` joined all raw `set-cookie` pairs with `; `, including an **empty** `access_token_web=` pair Vinted emits before the populated one. The API rejected the malformed cookie header with 401.
- **Fix:** Rewrote `buildCookieHeader` to skip empty-value cookies and dedupe by name (last non-empty wins). Verified API returns 200 with the corrected header.
- **Files modified:** scraper/scripts/spike-vinted-catalog.mjs
- **Verification:** Api status 200 on all URLs after fix; OVERALL VERDICT: PASS
- **Committed in:** c9b75c3

**2. [Rule 1 - Bug] Enrichment regex did not match Vinted's Next.js RSC payload**
- **Found during:** Task 2 (enrichment sample)
- **Issue:** Plain JSON regexes for `catalog_id` / `shipping` failed because the item detail page embeds item data in an RSC flight payload where keys are escaped as `\"key\"`.
- **Fix:** Switched enrichment extraction to escaped-RSC regex (`\\"catalog_id\\":(\d+)`, `\\"shipping\\":{\\"type\\":\\"...`). Confirmed `catalog_id` (e.g. 5148/3826/5453) and `shipping.type` ("shipping") extract over HTTP, eliminating the need for Playwright on these fields. Documented `posted_at` as scrape-run-time fallback.
- **Files modified:** scraper/scripts/spike-vinted-catalog.mjs, 17-SPIKE-VINTED-CATALOG.md
- **Verification:** enrichment sample shows catalog_id + shipping_type present, detail fixture written
- **Committed in:** c9b75c3, 84f9ffa

---

**Total deviations:** 2 auto-fixed (2 rule-1 bugs)
**Impact on plan:** Both fixes were necessary for the spike to extract data and document the correct enrichment path. No scope creep.

## Issues Encountered
- Vinted's bare `/api/v2/catalog/items` returns 401 without a valid session cookie — resolved via warm-up + correct cookie building (matches research pitfall).
- `posted_at` is not present in the item RSC payload or the catalog API — documented fallback to scrape run time (research A3). This is a known limitation carried into Plan 17-03 enrich.ts design.

## User Setup Required
- **live-vinted-network** (declared in plan): confirmed outbound HTTPS to vinted.it works from dev/WSL2 (HTTP 200). No proxy configured locally (direct fetch per D-17-33); production sustained crawl should use Italian residential proxy per Phase 16 ADR when blocked_ratio_7d ≥ 0.5.

## Next Phase Readiness
- Wave 0 **PASS** (human-approved). Field map and fixtures are implementation-ready.
- Plan 17-02 (Tracer) can now build `vinted/http-extract.ts` against the catalog fixture, `filters.ts` isFreePrice, library migrations, and a one-URL crawl → persist → feed.
- The discovered enrichment pattern (escaped-RSC regex for catalog_id + shipping.type; posted_at fallback) must be honored in Plan 17-03.

---
*Phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr*
*Completed: 2026-08-15*
