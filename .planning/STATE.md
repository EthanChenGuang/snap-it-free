---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Snag-style Consumer UX + Production Deploy
current_phase: 15
current_phase_name: scraper-incremental-crawl-and-search-efficiency
current_plan: 5
status: executing
stopped_at: Completed 15-04-PLAN.md
last_updated: "2026-08-11T18:08:17.855Z"
progress:
  total_phases: 9
  completed_phases: 7
  total_plans: 39
  completed_plans: 37
  percent: 78
last_activity: 2026-08-11
last_activity_desc: "Quick task 260811-nwf: scraper translation pipeline batch-scoped config/cap + bounded-concurrency dispatch, 80 round trips → 2-3 per batch of 20"
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-09)

**Core value:** Users can find and claim real free items near them in Venice faster than by manually checking Subito/FB Marketplace/community groups themselves.

**Current focus:** Phase 15 — scraper-incremental-crawl-and-search-efficiency

## Current Position

Milestone: **v2.0** — Snag-style Consumer UX + Production Deploy  
Phase: 15 (scraper-incremental-crawl-and-search-efficiency) — EXECUTING
**Current Plan:** 5
**Total Plans in Phase:** 6
Status: Ready to execute

Progress: [██████████] 95% v2.0 (0/7 phases)

## v2.0 Phase Queue

| Order | Phase | Name | Status |
|-------|-------|------|--------|
| 1 | 9 | Feed-First Home & Navigation IA | Next |
| 2 | 10 | Search, Filter Sheet & Distance | Planned |
| 3 | 11 | Grid Listing Cards | Planned |
| 4 | 12 | Favorites Category Folders | Planned |
| 5 | 13 | Select Location Flow | Verified |
| 6 | 14 | Settings Consumer Parity | Next |
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
| Phase 13-select-location-flow P01 | 2min | 2 tasks | 4 files |
| Phase 13-select-location-flow P02 | 2min | 2 tasks | 6 files |
| Phase 13-select-location-flow P03 | 2 min | 2 tasks | 2 files |
| Phase 13-select-location-flow P04 | 110s | 2 tasks | 1 files |
| Phase 13-select-location-flow P05 | 15min | 5 tasks | 23 files |
| Phase 14-settings-consumer-parity P03 | 4min | 1 tasks | 2 files |
| Phase 14-settings-consumer-parity P01 | 8min | 2 tasks | 1 files |
| Phase 14-settings-consumer-parity P06 | 5min | 2 tasks | 3 files |
| Phase 14-settings-consumer-parity P05 | 5min | 2 tasks | 4 files |
| Phase 14-settings-consumer-parity P07 | 12min | 2 tasks | 2 files |
| Phase 15 P01 | 12min | 3 tasks | 5 files |
| Phase 15 P02 | 5min | 2 tasks | 1 files |
| Phase 15 P03 | 8 | 2 tasks | 11 files |
| Phase 15 P04 | 480 | 2 tasks | 5 files |

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

**Last session:** 2026-08-11T18:08:17.844Z
**Stopped at:** Completed 15-04-PLAN.md
**Resume file:** None

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
- [Phase ?]: Partial post draft with valid lat/lng but missing locationConfirmed returns locationConfirmed false not null — preloads pin, blocks submit
- [Phase ?]: writePostDraft always persists locationConfirmed true regardless of caller input (D-36)
- [Phase ?]: Wave 0 lib-only TDD foundation — Plan 02 imports resolveCityLabel and post-draft storage
- [Phase ?]: Post context flyTo at DEFAULT_ZOOM instead of fitMapToRadius when radius UI hidden (D-26)
- [Phase ?]: D-12 accepted: non-location PostForm fields reset on navigate-out-and-back — follow-up phase candidate
- [Phase ?]: Radius chip bar keeps subtle shadow per DESIGN.md Level-2; only translucency and blur removed (D-43)
- [Phase ?]: Locate-me FAB failure stays silent — pin unchanged, no error UI per planner resolution
- [Phase ?]: deleteAccountData uses paginated storage.list before single remove(); hard delete via default deleteUser
- [Phase ?]: Applied migration 022 via Supavisor pooler after direct db host IPv6 unreachable in WSL2
- [Phase ?]: AccountSection returns null when logged out — destructive action requires session
- [Phase ?]: userId always from requireAuth(); request body never parsed (IDOR closed)
- [Phase ?]: Hide-only DND when push off — saved dnd_enabled preserved server-side
- [Phase ?]: No debounce on native time inputs — onChange fires on discrete commit
- [Phase ?]: TD-01 closed via retroactive 04-VERIFICATION synthesis (13/14 UAT truths, Test 12 physical-device block carried forward)
- [Phase ?]: Phase 14 regression audit uses f19aeb7^ baseline — zero diff on LanguageSection, GeneralSection, ZonesSection, ios-detect
- [Phase ?]: HttpCrawler wins Wave 0 spike — listing path props.pageProps.initialState.items.originalList
- [Phase ?]: Validation gate: JSON completeness ≥0.9; full minCountRatio 0.5; incremental 0.2
- [Phase ?]: Production proxy: Italian residential required; soft degraded gate (ADR 015)
- [Phase ?]: max_pages default 1 per D-15-23 page-1 ship; admin may allow up to 3 later
- [Phase ?]: Applied migration 023 via Supavisor pooler (IPv4) after direct db host IPv6 unreachable in WSL2
- [Phase ?]: Early-stop break at K leaves tail unprocessed per newest-first assumption
- [Phase ?]: Category JSON geo resolves via municipality centroid lookup without detail page
- [Phase ?]: unset USE_HTTP_CRAWLER defaults to on; shadow logs single-run compare metrics
- [Phase ?]: Block retry and detail enrichment use separate PlaywrightCrawler runs at concurrency 1

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
| 2026-08-11 | redesign-and-refactor-settings-page-ui-t | Settings page iOS Inset Grouped: account header card, grouped toggles, bottom logout |
| 2026-08-11 | redesign-and-refactor-post-item-page-to- | Post page iOS: multi-image carousel, grouped form card, category chips, frosted submit bar |
| 2026-08-11 | fix-aria-hidden-filter-trigger-focus | Blur filter-sheet trigger button on open to prevent aria-hidden focus-retention warning |
| 2026-08-11 | post-form-redesign | Multi-image draft persist fix, 17 Subito category grid, 5-grade condition pills, slug API |
| 2026-08-11 | post-media-refine | Photo hydration race fix, carousel/grid switcher, 5-col condition grid, usato→其他 |
| 2026-08-11 | post-image-persistence | Module-cache photo handoff + draft compression + quota-safe writes; fixes image loss on location return |
| 2026-08-11 | make-the-filter-sheet-apply-instantly-in | Removed draft-then-Apply model; 城市/分类 chip taps commit instantly to applied filters, 应用 is now close-only |
| 2026-08-11 | rename-the-subito-catch-all-category-lab | usato chip label "All categories" → "Other"/"Altro"/"其他"; matchesSubitoCategory now matches unresolved listings as the true catch-all (not just literal usato) |
| 2026-08-11 | speed-up-the-scraper-s-post-persist-tran | Scraper translation pipeline: batch-scoped config/cap load (was per-listing) + hand-rolled 4x bounded-concurrency LLM dispatch; 8 new tests, 95/95 scraper tests pass |

## Accumulated Context

### Roadmap Evolution

- Phase 15 expanded: incremental crawl (JSON + early-stop), proxy ADR (residential for prod), tech stack ADR (Crawlee HttpCrawler hybrid); SCRP-E01–E08 added to REQUIREMENTS.md
- Phase 12.1 inserted after Phase 12: add i18n support for the category names for it/zh/en (URGENT)
- Phase 12.1 executed: trilingual messages.feed.subitoCategories + locale-aware filter/chip/pill labels; UAT 5/5, unit 36/36
- Phase 12.1 verified (self-tested, no human in the loop per user request): UAT 5/5, security review 6/6 threats closed (retroactive STRIDE, no threat model authored at plan time), goal-backward verification 11/11 after fixing one gap — `scripts/phase12-uat-automation.mjs`'s selector had gone stale when an unrelated quick task (260810-tb5, commit 47d5259) swapped FilterSheet's checkbox list for a button chip grid 2 min after the UAT commit. Fixed and re-confirmed 5/5 against current HEAD. Phase marked complete in ROADMAP/STATE.
- Phase 13 verified: `/gsd-verify-work 13` — 20/20 automated must-haves, Plan 05 gap closure (cherry-pick 9d7dfae) green test:lib 287/287 + build; 13-VERIFICATION.md created; 4 human UAT items + D-12 PostForm field-loss documented open
