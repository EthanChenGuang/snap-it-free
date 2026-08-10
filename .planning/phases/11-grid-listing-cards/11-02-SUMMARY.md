---
phase: 11-grid-listing-cards
plan: 02
subsystem: ui
tags: [react, grid-card, buildCardMetadata, claimed-state, stitch-overrides]

requires:
  - phase: 11-grid-listing-cards
    provides: buildCardMetadata pure helper and unit tests from Plan 01
provides:
  - End-to-end claimed grid card on home feed with Reserved suffix and photo dim
  - ListListingCard imports shared buildCardMetadata with isClaimed wiring
  - Documented Stitch deviations (emerald FREE, rounded-2xl, glass heart)
  - Legacy ListPageClient inherits polish automatically via shared component
affects: [11-03-PLAN, 11-04-PLAN, FavoritesPageClient]

tech-stack:
  added: []
  patterns:
    - "Claimed photo dim via opacity-60 on ListingPhoto only — overlays stay full brightness"
    - "Grid Reserved suffix in metadata line only — no ReservedBadge overlay on grid"

key-files:
  created: []
  modified:
    - components/listings/ListListingCard.tsx

key-decisions:
  - "Photo-only opacity-60 for claimed dimming; FREE badge and heart overlays unaffected (D-21)"
  - "messages.listing.reserved used for grid metadata suffix per D-29"
  - "Legacy ListPageClient unchanged — inherits claimed suffix/dim without distanceMeters (city · time fallback)"

patterns-established:
  - "ListListingCard consumes buildCardMetadata object API with isClaimed from listing.status"
  - "Stitch override comment block documents D-02/D-07/D-09 intentional deviations"

requirements-completed: [CARD-01, CARD-02, CARD-03, CARD-04, CARD-05]

coverage:
  - id: D1
    description: "ListListingCard imports buildCardMetadata; inline helper removed; claimed isClaimed wired"
    requirement: CARD-01
    verification:
      - kind: unit
        ref: "lib/listings/card-metadata.test.ts"
        status: pass
      - kind: other
        ref: "rg buildCardMetadata from components/listings/ListListingCard.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "Claimed listings show opacity-60 on ListingPhoto only, not outer container"
    requirement: CARD-01
    verification:
      - kind: other
        ref: "rg opacity-60 components/listings/ListListingCard.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "Grid card visual contract — FREE badge, glass heart, 4:5 aspect, no Claim/ReservedBadge"
    requirement: CARD-03
    verification:
      - kind: other
        ref: "rg ClaimButton|ReservedBadge components/listings/ListListingCard.tsx (zero matches)"
        status: pass
    human_judgment: true
    rationale: "Visual adequacy of emerald pill, glass heart, and hover zoom requires human UAT on feed"
  - id: D4
    description: "FeedHomeClient passes distanceMeters from distanceMap unchanged (D-30)"
    requirement: CARD-02
    verification:
      - kind: other
        ref: "rg distanceMeters={distanceMap components/listings/FeedHomeClient.tsx"
        status: pass
    human_judgment: false
  - id: D5
    description: "ListPageClient renders shared ListListingCard without duplicate metadata builder"
    requirement: CARD-01
    verification:
      - kind: other
        ref: "rg ListListingCard components/listings/ListPageClient.tsx"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-08-10
status: complete
---

# Phase 11 Plan 02: End-to-End Claimed Grid Card Summary

**ListListingCard wired to shared buildCardMetadata with claimed Reserved suffix and photo-only opacity dim on home feed**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-10T16:20:37Z
- **Completed:** 2026-08-10T16:22:25Z
- **Tasks:** 3 completed
- **Files modified:** 1

## Accomplishments

- Removed inline `buildCardMetadata` from `ListListingCard`; imports tested helper from `lib/listings/card-metadata`
- Claimed listings append ` · Reserved` via `isClaimed: listing.status === 'claimed'` and dim photo with `opacity-60` on `ListingPhoto` only
- Preserved CARD-03–05 visual contract: emerald FREE badge, glass heart overlay, no Claim CTA, whole-card navigation
- Documented intentional Stitch deviations (D-02 emerald pill, D-07 rounded-2xl, D-09 glass heart)
- Verified `ListPageClient` inherits polish automatically without `distanceMeters` (city · time fallback)

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end claimed grid card — metadata suffix + photo dim on feed** - `49cc517` (feat)
2. **Task 2: Preserve grid card visual contract — FREE, heart, layout, no Claim** - `e91ad47` (docs)
3. **Task 3: Legacy ListPageClient inheritance verify** - verify-only (no file changes)

**Plan metadata:** pending (docs commit)

## Files Created/Modified

- `components/listings/ListListingCard.tsx` - Shared metadata import, claimed dim on photo, Stitch override comment

## Decisions Made

- Photo-only opacity for claimed dimming keeps FREE badge and heart at full brightness (D-21 research pitfall)
- `messages.listing.reserved` used for grid suffix; no `ReservedBadge` overlay on grid (D-17)
- Legacy list route gets claimed treatment without distance prop — acceptable city · time fallback (D-22)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run test:lib -- lib/listings/card-metadata.test.ts -x` fails because vitest 3.x rejects `-x` flag; ran targeted `npx vitest run lib/listings/card-metadata.test.ts` instead (7/7 pass)
- `npm run build` fails on pre-existing TypeScript error in `lib/admin/cleanup.ts` (out of scope)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Home feed grid card tracer path complete; ready for Plan 03 (favorites dedupe / distance on favorites)
- Manual UAT recommended: open `/` feed — claimed listing shows dimmed photo + Reserved suffix; FREE badge + single heart visible

## Self-Check: PASSED

- SUMMARY.md exists on disk
- ListListingCard.tsx modified
- Task commits 49cc517 and e91ad47 found in git log

---
*Phase: 11-grid-listing-cards*
*Completed: 2026-08-10*
