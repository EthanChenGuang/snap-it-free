---
phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr
plan: 06
subsystem: ui
tags: [vinted, ListListingCard, external-url, feed-search, favorites, stitch, i18n]

requires:
  - phase: 17
    plan: 02
    provides: source=vinted listings in mixed feed query path
provides:
  - Monochrome Stitch Vinted source chip on grid cards (D-17-26)
  - vinted.it HTTPS allowlist for detail external claim links (D-17-28)
  - Contract tests for feed search and source-agnostic favorites (D-17-30, D-17-31)
  - sourceVinted i18n keys in en/it/zh (I18N-01)
affects:
  - 17-07 (phase validation / ship)

tech-stack:
  added: []
  patterns:
    - Vinted source chip uses #f1f1f0 + border-outline-variant adjacent to FREE badge
    - isAllowedExternalUrl host allowlist extended for vinted.it claim flow

key-files:
  created:
    - lib/listings/favorites-compat.test.ts
  modified:
    - components/listings/ListListingCard.tsx
    - lib/listings/external-url.ts
    - lib/listings/external-url.test.ts
    - lib/listings/feed-search.test.ts
    - messages/en.ts
    - messages/it.ts
    - messages/zh.ts

key-decisions:
  - "sourceVinted chip label localized via messages.listing.sourceVinted (Vinted in all locales)"
  - "No FilterSheet source filter added — D-17-27 deferred per CONTEXT"

patterns-established:
  - "Grid card Vinted chip: listing.source === 'vinted' → bg-[#f1f1f0] text-xs beside FREE badge"

requirements-completed: [CARD-03, D-17-26, D-17-27, D-17-28, D-17-29, D-17-30, D-17-31, I18N-01]

coverage:
  - id: D1
    description: "Vinted source chip on grid cards with Stitch #f1f1f0 styling"
    requirement: D-17-26
    verification:
      - kind: unit
        ref: "grep vinted ListListingCard.tsx && grep sourceVinted messages/en.ts"
        status: pass
    human_judgment: true
    rationale: "Visual chip placement and Stitch token fidelity require human UI check"
  - id: D2
    description: "FREE badge renders on Vinted €0 grid cards unchanged"
    requirement: CARD-03
    verification:
      - kind: unit
        ref: "components/listings/ListListingCard.tsx — FREE span not gated by source"
        status: pass
    human_judgment: false
  - id: D3
    description: "Detail claim opens vinted.it HTTPS external_url via allowlist"
    requirement: D-17-28
    verification:
      - kind: unit
        ref: "lib/listings/external-url.test.ts#allows https://www.vinted.it/items/..."
        status: pass
    human_judgment: false
  - id: D4
    description: "No consumer source filter added to FilterSheet"
    requirement: D-17-27
    verification:
      - kind: unit
        ref: "grep source FilterSheet.tsx — zero matches"
        status: pass
    human_judgment: false
  - id: D5
    description: "matchesFeedSearch finds Vinted listings by translated title fields"
    requirement: D-17-31
    verification:
      - kind: unit
        ref: "lib/listings/feed-search.test.ts#finds Vinted listings"
        status: pass
    human_judgment: false
  - id: D6
    description: "Favorites and zone filter accept source=vinted without source branch"
    requirement: D-17-30
    verification:
      - kind: unit
        ref: "lib/listings/favorites-compat.test.ts"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-08-15
status: complete
---

# Phase 17 Plan 06: Consumer Vinted Polish Summary

**Stitch Vinted source chip on grid cards, vinted.it external URL allowlist, and source-agnostic feed search/favorites contract tests**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-15T14:12:53Z
- **Completed:** 2026-08-15T14:14:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Extended `isAllowedExternalUrl` with `vinted.it` / `www.vinted.it` so `ScrapedListingShell` claim opens Vinted listings in a new tab (D-17-28)
- Added monochrome Stitch `#f1f1f0` Vinted source chip beside the FREE badge on `ListListingCard` when `listing.source === 'vinted'` (D-17-26, D-17-29)
- Added `sourceVinted` i18n keys in en/it/zh messages (I18N-01)
- Contract tests confirm feed search matches Vinted titles and favorites/zone filters are source-agnostic (D-17-30, D-17-31)
- Confirmed FilterSheet has no source filter UI (D-17-27 deferred)

## Task Commits

Each task was committed atomically:

1. **Task 1: Source chip on ListListingCard + external URL allowlist** - `a57c8f7` (feat)
2. **Task 2: Feed search + favorites contract tests** - `da1ddbe` (test)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `components/listings/ListListingCard.tsx` — Vinted source chip + FREE badge flex row
- `lib/listings/external-url.ts` — vinted.it host allowlist
- `lib/listings/external-url.test.ts` — vinted HTTPS URL cases
- `lib/listings/feed-search.test.ts` — Vinted title search case
- `lib/listings/favorites-compat.test.ts` — filterByZone + toggleFavoriteId contract
- `messages/en.ts`, `messages/it.ts`, `messages/zh.ts` — `sourceVinted` label

## Decisions Made

- Chip label uses `messages.listing.sourceVinted` ("Vinted" in all three locales)
- No FilterSheet source filter — mixed feed stays unified per D-17-27

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

Task 2 contract tests passed on first run (RED phase) — feed search and favorites behavior was already source-agnostic from prior phases. No separate `feat` commit required; `test(17-06)` commit captures the contract.

## Issues Encountered

- `npm run build` fails on pre-existing `RunsListClient.tsx` type error (`targetUrlCount` missing) — out of scope for Plan 06; deferred
- `npm run test:lib` reports one pre-existing failure in `lib/admin/url-validate.test.ts` — out of scope

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Consumer Vinted presentation complete for grid, detail claim, search, and favorites
- Ready for Plan 17-07 phase validation

## Self-Check: PASSED

- FOUND: components/listings/ListListingCard.tsx
- FOUND: lib/listings/external-url.ts
- FOUND: lib/listings/favorites-compat.test.ts
- FOUND: a57c8f7
- FOUND: da1ddbe

---
*Phase: 17-configure-vinted-scraping-and-integrate-free-items-into-curr*
*Completed: 2026-08-15*
