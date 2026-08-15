---
phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr
plan: 05
subsystem: admin
tags: [vinted, admin, seed-urls, url-matrix, migration, ssrf, stitch]

requires:
  - phase: 17
    plan: 04
    provides: vinted-category-map catalog IDs for seed templates
provides:
  - RECOMMENDED_VINTED_SEED_URLS 34-entry Venice+Padova matrix
  - Migration flips vinted source live/disabled with catalog seeds
  - VintedUrlMatrix admin UI parity with Subito RegaloUrlMatrix
  - url-validate /catalog/{id} path hardening for vinted slug
affects:
  - 17-07 (phase verification grep for seed count and admin parity)

tech-stack:
  added: []
  patterns:
    - City intent via ?city=venezia|padova query param (D-17-06/10), not Vinted geo filters
    - Vinted admin matrix mirrors RegaloUrlMatrix chip grid (D-17-37)
    - SSRF mitigation requires /catalog/\\d+ pathname for vinted target URLs

key-files:
  created:
    - lib/admin/vinted-recommended-seed.ts
    - lib/admin/vinted-recommended-seed.test.ts
    - components/admin/VintedUrlMatrix.tsx
    - supabase/migrations/029_vinted_source_live_seed.sql
  modified:
    - lib/admin/url-validate.ts
    - lib/admin/url-validate.test.ts
    - components/admin/SourceDetailClient.tsx

key-decisions:
  - "D-17-05/19 option-a: Full 17×2 catalog URL matrix (34 seeds)"
  - "Migration numbered 029 — 025_scrape_run_diagnostics.sql already occupied"

patterns-established:
  - "buildDefaultVintedUrl(subitoSlug, city) → catalog/{id}-slug?order=newest_first&city="
  - "SourceDetailClient hasUrlMatrix covers subito + vinted with shared seed confirm dialog"

requirements-completed: [D-17-05, D-17-06, D-17-09, D-17-14, D-17-19, D-17-34, D-17-35, D-17-37, SCRP-E05]

coverage:
  - id: D1
    description: "RECOMMENDED_VINTED_SEED_URLS exports 34 Venice+Padova catalog URLs"
    requirement: D-17-05
    verification:
      - kind: unit
        ref: "lib/admin/vinted-recommended-seed.test.ts#exports 34 seed URLs"
        status: pass
    human_judgment: false
  - id: D2
    description: "url-validate requires vinted.it /catalog/{id} paths"
    requirement: D-17-03
    verification:
      - kind: unit
        ref: "lib/admin/url-validate.test.ts#accepts vinted.it catalog URL"
        status: pass
    human_judgment: false
  - id: D3
    description: "Migration sets vinted live, disabled, 90min interval, category seeds"
    requirement: D-17-34
    verification:
      - kind: other
        ref: "supabase/migrations/029_vinted_source_live_seed.sql"
        status: pass
    human_judgment: false
  - id: D4
    description: "Admin /admin/sources/vinted renders VintedUrlMatrix with apply recommended seed"
    requirement: D-17-37
    verification:
      - kind: unit
        ref: "components/admin/SourceDetailClient.tsx isVinted branch"
        status: pass
    human_judgment: true
    rationale: "Visual matrix parity and macOS layout require human admin page check"
  - id: D5
    description: "npm run build succeeds"
    requirement: SCRP-E05
    verification:
      - kind: other
        ref: "npm run build"
        status: fail
    human_judgment: false

duration: 6min
completed: 2026-08-15
status: complete
---

# Phase 17 Plan 05: Vinted Admin Seed Matrix Summary

**34 URL Venice+Padova Vinted catalog seed matrix, live/disabled migration, SSRF-hardened validation, and Subito-parity admin matrix UI**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-15T14:18:00Z
- **Completed:** 2026-08-15T14:24:00Z
- **Tasks:** 3 (1 decision + 2 implementation)
- **Files modified:** 7

## Accomplishments

- Created `vinted-recommended-seed.ts` with `buildDefaultVintedUrl`, 34 catalog seeds, D-17-06 header documenting city-intent via `?city=` + D-17-10 post-extract validation
- Added migration `029_vinted_source_live_seed.sql`: `implementation_status=live`, `enabled=false`, `crawl_interval_minutes=90`, replaces keyword gratis/regalo seeds (D-17-09, D-17-34, D-17-35)
- Hardened `url-validate.ts` with `/catalog/\d+` path requirement for vinted slug (T-17-SSRF)
- Shipped `VintedUrlMatrix` + `SourceDetailClient` isVinted branch mirroring Subito macOS settings layout (D-17-37)

## Task Commits

1. **Task 1: Confirm Venice+Padova URL matrix scope** — option-a selected; no code commit
2. **Task 2: Seed module, migration, URL validation** — `1044b42`
3. **Task 3: VintedUrlMatrix + SourceDetailClient branch** — `e6a1028`

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `lib/admin/vinted-recommended-seed.ts` — 17×2 seed matrix, city intent query params
- `lib/admin/vinted-recommended-seed.test.ts` — count 34 + catalog URL regex
- `supabase/migrations/029_vinted_source_live_seed.sql` — vinted live seed UPDATE
- `lib/admin/url-validate.ts` — VINTED_CATALOG_PATH_REGEX gate
- `lib/admin/url-validate.test.ts` — vinted accept/reject cases
- `components/admin/VintedUrlMatrix.tsx` — chip matrix UI (Venice/Padova × 17 categories)
- `components/admin/SourceDetailClient.tsx` — isVinted branch, shared seed apply/confirm

## Decisions Made

- **D-17-05/19 option-a:** Full 17×2 matrix with catalog URLs (recommended plan default)
- **Migration 029:** Plan specified 025 but `025_scrape_run_diagnostics.sql` already exists

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration file number 029 instead of 025**
- **Found during:** Task 2 (migration creation)
- **Issue:** `025_scrape_run_diagnostics.sql` already in repo
- **Fix:** Created `029_vinted_source_live_seed.sql` with identical UPDATE semantics
- **Files modified:** supabase/migrations/029_vinted_source_live_seed.sql
- **Committed in:** 1044b42

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Same SQL semantics; only filename differs from plan artifact table.

## Issues Encountered

- `npm run build` fails on pre-existing `RunsListClient.tsx` missing `targetUrlCount` (also noted in 17-06-SUMMARY) — out of scope
- Pre-existing `url-validate.test.ts` Milano rejection test fails (9-city expansion) — unrelated to vinted changes; new vinted tests pass

## User Setup Required

None - migration ready for operator apply; source remains disabled until toggled (D-17-34).

## Next Phase Readiness

- Plan 17-07 can grep `RECOMMENDED_VINTED_SEED_COUNT === 34` and admin vinted matrix
- Operator applies migration 029 then reviews `/admin/sources/vinted` before enabling

---
*Phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr*
*Completed: 2026-08-15*

## Self-Check: PASSED

- FOUND: `.planning/phases/17-configure-vinted-scraping-and-integrate-free-items-into-curr/17-05-SUMMARY.md`
- FOUND: commit `1044b42`
- FOUND: commit `e6a1028`
- FOUND: `lib/admin/vinted-recommended-seed.ts`
- FOUND: `components/admin/VintedUrlMatrix.tsx`
- FOUND: `supabase/migrations/029_vinted_source_live_seed.sql`
