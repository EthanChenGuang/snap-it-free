---
phase: 10-search-filter-sheet-distance
plan: 05
subsystem: i18n
tags: [i18n, filter-sheet, key-parity, trilingual, feed]

requires:
  - phase: 10-04
    provides: City-only labels and distance metadata wired in feed UI
provides:
  - Complete messages.feed filter vocabulary in zh/en/it
  - removeFilterAriaLabel and centerPillAriaLabel wired in FeedHeaderRow
  - filterComingSoon stub fully retired (verified zero refs)
  - Phase 10 validation sign-off with nyquist_compliant true
affects: [11, verify-work]

tech-stack:
  added: []
  patterns:
    - "Pill dismiss aria labels use removeFilterAriaLabel(label) template in all locales"
    - "FilterSheet radius row shows radiusOff vs withinKm(km) per enabled state"

key-files:
  created: []
  modified:
    - messages/zh.ts
    - messages/en.ts
    - messages/it.ts
    - components/listings/FilterSheet.tsx
    - components/shell/FeedHeaderRow.tsx
    - .planning/phases/10-search-filter-sheet-distance/10-VALIDATION.md

key-decisions:
  - "radiusEnable renamed to radiusEnabledLabel; radiusOff added for disabled radius row copy"
  - "City/category pill dismiss uses removeFilterAriaLabel template — no hardcoded English"
  - "Keyword alerts zone picker (settings) unchanged per D-03 — zoneLabel retained there only"
  - "Empty state reuses feed.emptySearch* for radius-only active filters per D-26/D-30"

patterns-established:
  - "All consumer filter copy flows through messages.feed.* — no zone names in filter UI"

requirements-completed: [I18N-01, FILT-01, FILT-02, FILT-03]

coverage:
  - id: D1
    description: Trilingual filter sheet and pill strings in zh/en/it under messages.feed
    requirement: I18N-01
    verification:
      - kind: unit
        ref: messages/key-parity.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: filterComingSoon stub removed with zero codebase references
    requirement: FILT-01
    verification:
      - kind: other
        ref: rg filterComingSoon --glob *.{ts,tsx} count=0
        status: pass
    human_judgment: false
  - id: D3
    description: Consumer filter UI free of zone name leaks (FeedHeaderRow, ListListingCard)
    requirement: FILT-03
    verification:
      - kind: other
        ref: grep zoneLabel FeedHeaderRow ListListingCard — no matches
        status: pass
    human_judgment: false
  - id: D4
    description: Filter sheet draft/Apply/Reset and drawer/nav overlap
    requirement: FILT-02
    verification: []
    human_judgment: true
    rationale: Vaul drawer interaction and visual overlap need manual QA per 10-VALIDATION.md
  - id: D5
    description: Phase 10 Wave 0 automated test suite
    requirement: FILT-01
    verification:
      - kind: unit
        ref: npm run test:lib -- lib/geo lib/filter-prefs lib/listings/filters lib/browse-center messages/key-parity
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-08-10
status: complete
---

# Phase 10 Plan 05: Trilingual Filter i18n Summary

**Complete zh/en/it messages.feed filter vocabulary with aria templates, stub removal verified, and Phase 10 validation sign-off**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-10T13:14:00Z
- **Completed:** 2026-08-10T13:17:00Z
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments

- Added `radiusOff`, `radiusEnabledLabel`, `centerPillAriaLabel`, and `removeFilterAriaLabel` to all three locale catalogs
- Wired FilterSheet radius row and FeedHeaderRow pill dismiss/link aria labels to i18n — no hardcoded English in filter UI
- Verified `filterComingSoon` fully absent; consumer paths free of `zoneLabel(` leaks
- Updated `10-VALIDATION.md` with `nyquist_compliant: true`, `wave_0_complete: true`, and storage key documentation

## Task Commits

Each task was committed atomically:

1. **Task 1: Complete trilingual feed filter strings** - `d59efc5` (feat)
2. **Task 2: Remove filterComingSoon stub + grep zone leak audit** - verification only (no diff; stub removed in Plan 02, audit green)
3. **Task 3: Phase gate full lib test suite + integration verify** - `f56f7fe` (chore)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `messages/{zh,en,it}.ts` — full feed filter vocabulary per D-79/D-80
- `components/listings/FilterSheet.tsx` — radiusOff/withinKm row, radiusEnabledLabel toggle aria
- `components/shell/FeedHeaderRow.tsx` — centerPillAriaLabel on link, removeFilterAriaLabel on city/category pills
- `.planning/phases/10-search-filter-sheet-distance/10-VALIDATION.md` — phase gate sign-off

## Decisions Made

- Keyword alerts settings zone picker untouched per D-03 — zone names remain only in settings/admin contexts
- Empty state uses `feed.emptySearchTitle/Description` for any active filter including radius-only (D-26/D-30/D-82)
- Storage keys documented: `shoumanwu_filter_prefs`, `shoumanwu_browse_center` (D-76/D-77)

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

Task 2 required no additional code changes — `filterComingSoon` was removed in Plan 02 and zone-leak grep passed on first audit.

## Issues Encountered

- **Pre-existing full-suite failures:** `lib/admin/subito-regalo-catalog.test.ts` (3 Padova spike tests) fails outside Phase 10 scope; Phase 10 Wave 0 tests all green (266/266 in scoped run)
- **Pre-existing build failure:** TypeScript error in `lib/admin/cleanup.ts` — unrelated to filter i18n; deferred to admin phase

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 10 all 5 plans complete — ready for `/gsd-verify-work` with manual QA checklist in 10-VALIDATION.md (sheet draft discard, pill dismiss, center/GPS fallback, drawer/nav overlap).

Phase 11 (Grid Listing Cards) can proceed after verify-work human gate.

---
*Phase: 10-search-filter-sheet-distance*
*Completed: 2026-08-10*

## Self-Check: PASSED

- FOUND: .planning/phases/10-search-filter-sheet-distance/10-05-SUMMARY.md
- FOUND: d59efc5
- FOUND: f56f7fe
- FOUND: messages/zh.ts, messages/en.ts, messages/it.ts
- FOUND: components/listings/FilterSheet.tsx
- FOUND: components/shell/FeedHeaderRow.tsx
