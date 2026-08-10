---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Snag-style Consumer UX + Production Deploy
current_phase: 13
current_phase_name: Select Location Flow
current_plan: Not started
status: planning
stopped_at: Phase 13 context gathered
last_updated: "2026-08-10T18:58:00.000Z"
progress:
  total_phases: 8
  completed_phases: 4
  total_plans: 20
  completed_plans: 20
  percent: 50
last_activity: 2026-08-10
last_activity_desc: "Completed quick task 260810-tb5: iOS-native filter bottom sheet redesign"
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-09)

**Core value:** Users can find and claim real free items near them in Venice faster than by manually checking Subito/FB Marketplace/community groups themselves.

**Current focus:** Phase 12 — canonical-category-mapping

## Current Position

Milestone: **v2.0** — Snag-style Consumer UX + Production Deploy  
Phase: 13 — Select Location Flow
**Current Plan:** Not started
**Total Plans in Phase:** 4
Status: Ready to plan

Progress: [██████████] 100% v2.0 (0/7 phases)

## v2.0 Phase Queue

| Order | Phase | Name | Status |
|-------|-------|------|--------|
| 1 | 9 | Feed-First Home & Navigation IA | Next |
| 2 | 10 | Search, Filter Sheet & Distance | Planned |
| 3 | 11 | Grid Listing Cards | Planned |
| 4 | 12 | Favorites Category Folders | Planned |
| 5 | 13 | Select Location Flow | Planned |
| 6 | 14 | Settings Consumer Parity | Planned |
| 7 | 7 | Production Deploy (Vercel + Fly.io) | Planned |

## Performance Metrics

**Velocity (v1.0):**

- Total plans completed: 39
- Milestone duration: 16 days (2026-07-24 → 2026-08-09)

**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 9 P01 | 12min | 3 tasks | 10 files |
| Phase 09 P02 | 3min | 3 tasks | 15 files |
| Phase 09-feed-first-home-navigation-ia P04 | 4min | 3 tasks | 5 files |
| Phase 09-feed-first-home-navigation-ia P03 | 8min | 3 tasks | 11 files |
| Phase 10-search-filter-sheet-distance P01 | 4min | 3 tasks | 12 files |
| Phase 10-search-filter-sheet-distance P02 | 8min | 3 tasks | 12 files |
| Phase 10-search-filter-sheet-distance P03 | 12min | 3 tasks | 11 files |
| Phase 10-search-filter-sheet-distance P04 | 8min | 3 tasks | 7 files |
| Phase 10-search-filter-sheet-distance P05 | 3min | 3 tasks | 6 files |
| Phase 11-grid-listing-cards P01 | 3min | 2 tasks | 3 files |
| Phase 11-grid-listing-cards P02 | 2min | 3 tasks | 1 files |
| Phase 11-grid-listing-cards P03 | 2min | 3 tasks | 1 files |
| Phase 11-grid-listing-cards P04 | 3min | 3 tasks | 2 files |
| Phase 12-canonical-category-mapping P01 | 5min | 3 tasks | 7 files |
| Phase 12-canonical-category-mapping P02 | 8min | 3 tasks | 5 files |
| Phase 12-canonical-category-mapping P03 | 5min | 3 tasks | 5 files |
| Phase 12-canonical-category-mapping P04 | 3 min | 3 tasks | 2 files |

## Deferred Items (from v1.0)

- Phase 4 formal `04-VERIFICATION.md` → TD-01 (Phase 14)
- iPhone standalone push QA → TD-02 (Phase 7)
- Google OAuth production redirects → TD-03 (Phase 7)
- Production deploy → Phase 7 (after UX phases)

## Next Steps

1. `/gsd-discuss-phase 9` — UI/IA decisions for feed home + nav
2. `/gsd-plan-phase 9` — executable plans
3. `/gsd-execute-phase 9` — implementation

---
*State updated: 2026-08-09 after v2.0 milestone init*

## Session

**Last session:** 2026-08-10T18:56:44.386Z
**Stopped at:** Phase 13 context gathered
**Resume file:** .planning/phases/13-select-location-flow/13-CONTEXT.md

## Decisions

- [Phase ?]: D-01 locked: four-tab bottom nav supersedes NAV-02 drawer-only Post
- [Phase ?]: CompactLocaleChip uses 中/EN/IT pill with inline Radix dropdown
- [Phase ?]: Feed scroll-away attaches to FeedHomeClient inner scroller via FeedScrollContext
- [Phase ?]: Favorites fetch errors fall back to empty state per E5 backstop
- [Phase ?]: Manage my posts link moved from NavMenuDrawer to GeneralSection
- [Phase ?]: SelectLocationZoneChips separate export keeps MapExplorer All chip unchanged
- [Phase ?]: Confirm label derived from selected zone or nearest Venice vs Padova distance
- [Phase ?]: Wave 0 lib-only TDD foundation — Plans 02–05 import tested helpers without reimplementing
- [Phase ?]: matchesAnySubitoCategories uses (listing, selected[]) matching FeedHomeClient pipeline
- [Phase ?]: D-01 proceed-city-only: consumer UI shows All · Venice · Padova only — zone names retired
- [Phase ?]: Filter stub toast replaced with Vaul FilterSheet per D-59
- [Phase ?]: Categories migrated to FeedFilterContext multi-select array per D-50
- [Phase ?]: composeFeedListings exported from useDistanceCenter for testable D-29 pipeline
- [Phase ?]: Center pill shown only for browse or GPS sources; Venice default has no pill
- [Phase ?]: Card metadata uses consumer city keys when distance unavailable; never zone subdivisions
- [Phase ?]: Select-location confirm label derived from nearest city Venice vs Padova
- [Phase ?]: matchesFeedSearch accepts ConsumerCityLabels instead of zoneLabel
- [Phase ?]: radiusEnable renamed to radiusEnabledLabel; removeFilterAriaLabel template for city/category pill dismiss
- [Phase ?]: filterComingSoon stub verified absent; consumer filter UI uses city keys only per D-03/D-30
- [Phase ?]: buildCardMetadata extracted to lib/listings/ with TDD; ListListingCard import deferred to Plan 02
- [Phase ?]: Photo-only opacity-60 for claimed dimming; FREE badge and heart overlays unaffected (D-21)
- [Phase ?]: ListPageClient inherits claimed suffix/dim without distanceMeters — city · time fallback acceptable (D-22)
- [Phase ?]: Favorites inline haversine per listing — no composeFeedListings per D-30
- [Phase ?]: useDistanceCenter(false) on favorites — center resolves, radius filtering off per D-23
- [Phase ?]: No feed.cardReserved variant — listing.reserved fits metadata in zh/en/it per Plan 04 verification
- [Phase ?]: Phase 11 scoped tests pass; subito-regalo-catalog and cleanup.ts failures deferred as pre-existing admin debt
- [Phase ?]: Unknown DB slugs fall through to title inference (D-18)
- [Phase ?]: Phase 12 scope pivot: CAT-01–03 active, FAV-01–03 deferred v3+
- [Phase ?]: ListingCategoryFieldRow.source optional with subito default for legacy callers
- [Phase ?]: Filter and display paths both consume resolveCanonicalCategorySlug exclusively
- [Phase ?]: POST_CATEGORIES derived from POST_CATEGORY_TO_SLUG for zod enum and PostForm picker
- [Phase ?]: UGC create accepts postCategory enum only; server maps slug at insert (V5)
- [Phase ?]: Phase 12 Nyquist sign-off uses phase-scoped vitest; pre-existing admin test/build debt documented not blocking CAT gates

## Quick Tasks Completed

| Date | Slug | Summary |
|------|------|---------|
| 2026-08-10 | interruptible-rubberband-spring | Interruptible spring overscroll with stretch-base tracking and full gesture reset |
| 2026-08-10 | rubberband-scroll-lock-fix | Fix repeat pull lock by stopping Motion animations and resetting gesture state |
| 2026-08-10 | ios-rubberband-scroll | iOS rubberband overscroll on feed + favorites via RubberbandScroll + Motion spring fallback |
| 2026-08-10 | feed-ui-polish | Feed header icons, short search placeholder, floating nav capsule w/ scroll-hide |
| 2026-08-10 | waterfall-feed-polish | Full-bleed scroll under glass nav, icon/card aesthetic polish |
| 2026-08-10 | select-location-radius-pin-radar | Radius pill clicks, pin overlay, minimalist radar/circle styling |
| 2026-08-10 | redesign-filter-bottom-sheet-ui-to-ios-n | iOS-native filter sheet: pill city chips, 3-col category chip grid, sticky blurred Reset/Apply bar |
| 2026-08-10 | refine-feed-list-page-header-filtering-p | Remove city/radius pills; split filter vs map badge indicators |

## Accumulated Context

### Roadmap Evolution

- Phase 12.1 inserted after Phase 12: add i18n support for the category names for it/zh/en (URGENT)
- Phase 12.1 executed: trilingual messages.feed.subitoCategories + locale-aware filter/chip/pill labels; UAT 5/5, unit 36/36
