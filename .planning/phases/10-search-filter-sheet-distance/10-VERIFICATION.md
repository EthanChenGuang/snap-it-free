---
phase: 10-search-filter-sheet-distance
verified: 2026-08-10T13:20:00Z
status: human_needed
score: 28/32 must-haves verified
behavior_unverified: 4
overrides_applied: 1
overrides:
  - must_have: "FILT-04 Venice zone chips (Centro / Mestre / Lido) remain available"
    reason: "D-01 locked decision — city-only All · Venice · Padova consumer filter supersedes zone-chip UX; data layer retains zone enum"
    accepted_by: "phase-context D-01"
    accepted_at: "2026-08-10"
behavior_unverified_items:
  - truth: "Draft filter edits discarded on swipe/overlay close without Apply (D-53)"
    test: "Open filter sheet, change city to Padova, swipe down or tap overlay to close without Apply; reopen sheet"
    expected: "Draft reverts to previously applied filters; feed unchanged until Apply"
    why_human: "Vaul drawer dismiss gesture and draft/applied state transition not covered by unit tests"
  - truth: "Confirm location on /select-location immediately re-filters feed (D-07/D-20)"
    test: "Note feed order/distances, open /select-location, pan map, tap Confirm"
    expected: "Browse center saved, feed re-sorts by distance from new pin without opening filter sheet"
    why_human: "BrowseCenterProvider → useDistanceCenter → composeFeedListings chain requires runtime navigation"
  - truth: "Center pill dismiss clears browse center → GPS → Venice default chain (D-12)"
    test: "With saved browse center pill visible, tap × on center pill"
    expected: "Browse center cleared, pill shows My location (GPS) or disappears; distances recompute from fallback center"
    why_human: "Geolocation permission and clearBrowseCenter + requestGps refetch ordering not unit-tested in browser"
  - truth: "Card distances recompute immediately when center changes (D-64)"
    test: "With coord listings visible, confirm new location or dismiss center pill"
    expected: "ListListingCard metadata line updates distance values without page reload"
    why_human: "useMemo wiring present but React re-render timing with geolocation async not exercised by tests"
human_verification:
  - test: "Filter sheet draft/Apply/Reset flow (FILT-02)"
    expected: "Change radius in sheet, close without Apply → no feed change; Apply → pills update and prefs persist; Reset → radius off, city All, categories cleared (browse center and search unchanged)"
    why_human: "Vaul drawer interaction and draft/applied semantics require DOM"
  - test: "Active filter pills dismiss in order (FILT-03)"
    expected: "Pills appear Search → Center → Radius → City → Categories; each × dismiss updates feed immediately; flex-wrap on narrow viewport"
    why_human: "Pill DOM interaction and i18n label rendering"
  - test: "Center pill + GPS fallback (FILT-05)"
    expected: "Clear center → one-shot GPS or Venice default; confirm location → immediate re-filter and center pill label"
    why_human: "Browser geolocation permission API"
  - test: "Drawer height vs bottom nav (FILT-01)"
    expected: "Filter sheet max-h ~85vh; sticky footer visible; bottom nav capsule not fully obscured"
    why_human: "Visual layout QA"
---

# Phase 10: Search, Filter Sheet & Distance Verification Report

**Phase Goal:** Filter bottom sheet (km radius + categories), active filter pills, haversine distance; city-only consumer filter per D-01 override.
**Verified:** 2026-08-10T13:20:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Filter sheet: radius slider 1–50 km persisted via `shoumanwu_filter_prefs` (FILT-01, ROADMAP SC1) | ✓ VERIFIED | `FilterSheet.tsx` range input; `lib/filter-prefs/storage.ts` read/write/subscribe |
| 2 | Filter sheet: category multi-select checklist with OR logic (FILT-01) | ✓ VERIFIED | `FilterSheet.tsx` maps `SUBITO_CATEGORY_SLUGS`; `matchesAnySubitoCategories` in `subito-categories.ts` |
| 3 | Filter sheet: Apply commits draft; Reset clears radius/city/categories (FILT-02) | ✓ VERIFIED | `FeedFilterContext.tsx` `applyDraft`/`resetFilters`; footer in `FilterSheet.tsx` |
| 4 | Filter button opens Vaul sheet; `filterComingSoon` stub removed (D-59) | ✓ VERIFIED | `FeedHeaderRow.tsx` `setSheetOpen(true)`; zero `filterComingSoon` in `*.{ts,tsx}` |
| 5 | Sheet section order Radius → City → Categories (D-48) | ✓ VERIFIED | `FilterSheet.tsx` section order |
| 6 | City filter All · Venice · Padova only — no zone names in consumer UI (D-01/FILT-04 override) | ✓ VERIFIED | `ConsumerCityChipSelector` in `FilterSheet.tsx`; no `zoneLabel` in feed header/card |
| 7 | Draft edits discarded on close without Apply (D-53) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `handleOpenChange` + `resetDraftFromApplied` wired; no E2E test |
| 8 | Active filter pills: search, center, radius, city, categories — dismissible (FILT-03) | ✓ VERIFIED | `FeedActiveFilterPills` in `FeedHeaderRow.tsx`; dismiss handlers call context/storage |
| 9 | Pill order Search → Center → Radius → City → Categories (D-66) | ✓ VERIFIED | Render order in `FeedActiveFilterPills` |
| 10 | Filter icon dot badge when radius/city/categories active (D-56) | ✓ VERIFIED | `hasActiveFilters` in `FeedFilterContext.tsx`; dot in `FeedHeaderRow.tsx` |
| 11 | Pipeline order search → radius → city → categories → sort (D-29) | ✓ VERIFIED | `composeFeedListings` in `hooks/useDistanceCenter.ts`; tests in `useDistanceCenter.test.ts` |
| 12 | Radius ON excludes listings missing lat/lng (FILT-05/D-23) | ✓ VERIFIED | `filterByRadiusKm` + test "excludes listing with null lat when radius ON" |
| 13 | Radius OFF includes no-coord listings (D-24) | ✓ VERIFIED | Test "includes no-coord listing when radius OFF" |
| 14 | Nearest-first sort when center active (D-11) | ✓ VERIFIED | `sortByDistance` in pipeline; test "sorts by distance when center is active" |
| 15 | Haversine math within tolerance (FILT-05/D-22) | ✓ VERIFIED | `lib/geo/haversine.ts`; `haversine.test.ts` passes |
| 16 | Smart distance units "350 m" / "2.3 km" (D-15) | ✓ VERIFIED | `lib/geo/format-distance.ts`; `format-distance.test.ts` passes |
| 17 | Card metadata `{distance} · {time}` when coords + center (D-60–62) | ✓ VERIFIED | `ListListingCard.tsx` `buildCardMetadata` + `formatDistance` |
| 18 | No-coord cards omit distance; city or time-only fallback (D-25/D-63) | ✓ VERIFIED | `buildCardMetadata` branch when `distanceMeters == null` |
| 19 | Distance shown when radius OFF but center exists (D-19) | ✓ VERIFIED | `distanceMap` built whenever `center` truthy; `FeedHomeClient` passes `distanceMeters` regardless of `radiusEnabled` |
| 20 | Card distances recompute on center change (D-64) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `useMemo` deps include `center`; no runtime test |
| 21 | SelectLocationClient pan-only; zone chips removed (D-32) | ✓ VERIFIED | No `SelectLocationZoneChips` import; `writeBrowseCenter` on Confirm |
| 22 | Confirm location saves city-level label; immediate feed update (D-07/D-20) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `SelectLocationClient.tsx` Confirm → `writeBrowseCenter` + `router.push('/')`; BrowseCenterProvider wiring present |
| 23 | Center pill: tap → /select-location; × → clearBrowseCenter + GPS refetch (D-12/D-13) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `CenterFilterPill` + `handleClearCenter` in `FeedHeaderRow.tsx` |
| 24 | `selectedCategory` removed from FeedScrollContext (D-50) | ✓ VERIFIED | `FeedScrollContext.tsx` exports only scroll + search |
| 25 | FeedFilterProvider nested in AppChrome (D-75) | ✓ VERIFIED | `AppChrome.tsx` wraps feed branch |
| 26 | Filter prefs corrupt JSON → defaults; radius clamp 1–50 (D-76) | ✓ VERIFIED | `lib/filter-prefs/storage.test.ts` (9 tests pass) |
| 27 | City mapping centro/mestre/lido → venice; padova → padova (D-02/D-34) | ✓ VERIFIED | `listingConsumerCity` in `filters.ts`; 18 filter tests pass |
| 28 | feed-search uses consumer city labels not zoneLabel (D-38) | ✓ VERIFIED | `lib/listings/feed-search.ts`; 7 feed-search tests pass |
| 29 | All Phase 10 filter strings in zh/en/it (I18N-01 partial) | ✓ VERIFIED | `messages/{zh,en,it}.ts` feed keys; `key-parity.test.ts` passes |
| 30 | Empty state reuses `feed.emptySearch*` for active filters (D-26/D-82) | ✓ VERIFIED | `FeedHomeClient.tsx` `hasActiveFilter` predicate |
| 31 | Keyword alerts zone picker unchanged (D-03) | ✓ VERIFIED | `ZonesSection.tsx` / `AlertCreateSheet.tsx` still use `zoneLabel` — out of feed scope |
| 32 | `clearBrowseCenter` removes key and dispatches event (D-12) | ✓ VERIFIED | `lib/browse-center/storage.ts`; 8 storage tests pass |

**Score:** 28/32 truths verified (4 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/geo/haversine.ts` | Great-circle distance | ✓ VERIFIED | 20 lines, exported `haversineKm` |
| `lib/geo/format-distance.ts` | Smart metric formatting | ✓ VERIFIED | Used by `ListListingCard` |
| `lib/filter-prefs/storage.ts` | Persisted filter prefs | ✓ VERIFIED | WIRED via `FeedFilterContext` useSyncExternalStore |
| `lib/listings/filters.ts` | City/radius/sort helpers | ✓ VERIFIED | WIRED in `composeFeedListings` |
| `components/shell/FeedFilterContext.tsx` | Applied vs draft state | ✓ VERIFIED | WIRED in AppChrome, FilterSheet, FeedHomeClient |
| `components/listings/FilterSheet.tsx` | Bottom sheet UI | ✓ VERIFIED | WIRED from FeedHeaderRow |
| `components/shell/FeedHeaderRow.tsx` | Pills + sheet trigger | ✓ VERIFIED | WIRED in feed layout |
| `components/listings/FeedHomeClient.tsx` | Filter pipeline | ✓ VERIFIED | Calls `composeFeedListings`, passes `distanceMeters` |
| `hooks/useDistanceCenter.ts` | Center resolution + pipeline | ✓ VERIFIED | Used by FeedHomeClient + FeedHeaderRow |
| `components/listings/ListListingCard.tsx` | Distance metadata | ✓ VERIFIED | `distanceMeters` prop rendered |
| `components/map/SelectLocationClient.tsx` | Pan-only center picker | ✓ VERIFIED | Zone chips removed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `FeedHeaderRow` | `FilterSheet` | `setSheetOpen(true)` | ✓ WIRED | Filter button onClick |
| `FilterSheet` | `FeedFilterContext` | `applyDraft` → `writeFilterPrefs` | ✓ WIRED | Persists to localStorage |
| `FeedHomeClient` | `composeFeedListings` | `useMemo` with applied/center | ✓ WIRED | Full pipeline |
| `FeedHomeClient` | `ListListingCard` | `distanceMeters={distanceMap.get(...)}` | ✓ WIRED | Per-listing distance |
| `SelectLocationClient` | Browse center store | `writeBrowseCenter` on Confirm | ✓ WIRED | Triggers provider update |
| `FeedHeaderRow` center pill × | GPS refetch | `clearBrowseCenter` + `requestGps` | ✓ WIRED | Handler present; runtime untested |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `FeedHomeClient` | `filteredListings` | `useListingsPoll` + `composeFeedListings` | Yes — live listing rows | ✓ FLOWING |
| `FeedHomeClient` | `distanceMap` | `haversineKm(center, listing.lat/lng)` | Yes — computed from coords | ✓ FLOWING |
| `FeedFilterContext` | `applied` | `readFilterPrefs()` localStorage | Yes — persisted prefs | ✓ FLOWING |
| `ListListingCard` | `distanceMeters` | prop from parent distanceMap | Yes — not hardcoded | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Haversine + format distance | `npx vitest run lib/geo/*.test.ts` | 4 tests pass | ✓ PASS |
| Filter prefs round-trip | `npx vitest run lib/filter-prefs/storage.test.ts` | 9 tests pass | ✓ PASS |
| Pipeline radius exclusion | `npx vitest run hooks/useDistanceCenter.test.ts` | 8 tests pass | ✓ PASS |
| i18n key parity | `npx vitest run messages/key-parity.test.ts` | 3 tests pass | ✓ PASS |
| filterComingSoon absent | `rg filterComingSoon --glob '*.{ts,tsx}'` | 0 matches in source | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no probe scripts declared for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FILT-01 | 01, 02, 03, 05 | Radius slider + category multi-select persisted | ✓ SATISFIED | FilterSheet + storage module + tests |
| FILT-02 | 02, 03, 05 | Apply/Reset; filters compose with search/city | ✓ SATISFIED | FeedFilterContext draft/applied; pipeline AND composition |
| FILT-03 | 03, 05 | Active dismissible pills below search | ✓ SATISFIED | FeedActiveFilterPills; human verify for interaction |
| FILT-04 | 01, 02, 04 | Zone/city filters (D-01 override: city-only) | ✓ SATISFIED (override) | All/Venice/Padova; zone enum mapped in lib layer |
| FILT-05 | 01, 03, 04 | Client haversine; no-coord exclusion | ✓ SATISFIED | haversine.ts + filterByRadiusKm + card distance |
| I18N-01 (partial) | 02, 04, 05 | Phase 10 filter strings zh/en/it | ✓ SATISFIED | messages.feed.* keys; key-parity green |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None in phase-modified source files | — | — |

No `TBD`/`FIXME`/`filterComingSoon` in phase implementation files. Unrelated full-suite failure in `lib/admin/subito-regalo-catalog.test.ts` (3 tests) is outside Phase 10 scope; all 66 phase-specific tests pass.

### Human Verification Required

### 1. Filter sheet draft/Apply/Reset

**Test:** Open filter sheet, change radius, close without Apply → no change; Apply → pills update; Reset clears filters (not browse center/search).
**Expected:** Draft/applied semantics match D-51/D-52/D-53.
**Why human:** Vaul drawer interaction.

### 2. Active filter pills dismiss

**Test:** Apply Venice + category + radius; dismiss each pill via ×.
**Expected:** Feed updates immediately; pill order preserved.
**Why human:** DOM + i18n rendering.

### 3. Center pill + GPS fallback

**Test:** Confirm location; dismiss center pill; observe GPS/Venice fallback.
**Expected:** Immediate re-filter; trilingual My location label.
**Why human:** Geolocation permission API.

### 4. Drawer vs bottom nav layout

**Test:** Open filter sheet on mobile viewport.
**Expected:** ~85vh max height; footer buttons accessible; nav not fully obscured.
**Why human:** Visual QA.

### Gaps Summary

No blocking implementation gaps found. Phase 10 deliverables exist in the codebase with unit-test coverage for the lib layer and wiring verified through imports and data-flow traces. Four behavior-dependent truths (draft discard, confirm-location re-filter, center-pill dismiss chain, live card distance recompute) are present and wired but require human verification per `10-VALIDATION.md`. Status is **human_needed**, not `gaps_found`.

---

_Verified: 2026-08-10T13:20:00Z_
_Verifier: Claude (gsd-verifier)_
