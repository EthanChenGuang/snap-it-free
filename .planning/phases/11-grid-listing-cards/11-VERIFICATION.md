---
phase: 11-grid-listing-cards
verified: 2026-08-10T16:31:00Z
status: human_needed
score: 10/12 must-haves verified
behavior_unverified: 2
overrides_applied: 0
behavior_unverified_items:
  - truth: "FavoriteButton login gate blocks unauthenticated toggle and opens AuthPromptModal on grid"
    test: "Open home feed logged out; click heart on any card"
    expected: "Auth prompt modal opens; favorite state does not toggle; no API call"
    why_human: "Auth gate is wired in FavoriteButton handleClick but no component/integration test exercises the session=false path on grid cards"
  - truth: "Heart click does not trigger card navigation (stopPropagation on favorite)"
    test: "Click heart on a grid card (logged in or out)"
    expected: "Card does not navigate to /listing/[id]; only favorite action or auth modal fires"
    why_human: "stopPropagation lives in FavoriteButton; card uses article onClick for navigation — interaction ordering requires runtime click test"
human_verification:
  - test: "Open `/` feed grid and inspect card chrome"
    expected: "Each card shows emerald FREE pill top-left, glass heart top-right, 4:5 portrait image with rounded-2xl, line-clamp-1 title, text-xs metadata"
    why_human: "Visual Stitch contract (D-01–D-08, D-18, D-20) cannot be judged by grep alone"
  - test: "Toggle favorite logged in on feed grid"
    expected: "Single heart per card; orange filled state when favorited; toast on add/remove (D-27)"
    why_human: "Favorited visual state and toast are runtime UX behaviors"
  - test: "Open `/favorites` with saved listings and active distance center"
    expected: "Single heart per card (no duplicate overlay); metadata shows `{distance} · {time}` when lat/lng and center available"
    why_human: "Favorites distance wiring is code-present; runtime center resolution depends on browse/GPS consent chain"
  - test: "Find a claimed listing on feed grid"
    expected: "Photo dimmed (opacity-60 on ListingPhoto only); FREE badge and heart remain full brightness; metadata ends with localized Reserved suffix"
    why_human: "Claimed dimming and suffix are visual/runtime checks on live listing data"
  - test: "Confirm no Claim CTA on grid; open listing detail for scraped and UGC items"
    expected: "Grid cards have no Claim button; detail page retains claim/deep-link actions in ScrapedListingShell / UgcListingShell"
    why_human: "Grid absence is grep-verified; detail-page claim UX requires manual navigation confirm"
---

# Phase 11: Grid Listing Cards Verification Report

**Phase Goal:** Polished grid cards with FREE badge, favorite heart, simplified metadata; no Claim on grid.

**Verified:** 2026-08-10T16:31:00Z  
**Status:** human_needed  
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Grid cards show image, truncated title, relative time in metadata (CARD-01) | ✓ VERIFIED | `ListListingCard.tsx`: `ListingPhoto`, `line-clamp-1` title, `formatRelativeTime` → `buildCardMetadata` |
| 2 | When `distanceMeters` set, metadata shows `{distance} · {time}` without city (CARD-02, D-16) | ✓ VERIFIED | `card-metadata.ts` L14–15; 7/7 unit tests pass including D-16 exclusion |
| 3 | When distance unavailable, metadata shows `{city} · {time}` fallback (D-19) | ✓ VERIFIED | `card-metadata.ts` L17; test "city · time fallback" |
| 4 | Claimed listings append localized `· Reserved` suffix (D-17) | ✓ VERIFIED | `ListListingCard` passes `isClaimed` + `messages.listing.reserved`; unit test covers suffix |
| 5 | Claimed photo dimmed on `ListingPhoto` only, overlays stay bright (D-21) | ✓ VERIFIED | `opacity-60` on `ListingPhoto` className only; FREE badge + heart are siblings outside photo opacity |
| 6 | FREE badge on all listings with emerald glass pill (CARD-03, D-01–D-04) | ✓ VERIFIED | `bg-emerald-500/80 backdrop-blur` span with `messages.listing.free` — visual polish needs human |
| 7 | Single in-card `FavoriteButton` with glass overlay styling (CARD-04, D-09–D-12) | ✓ VERIFIED | One `FavoriteButton` `tone="overlay"` in `ListListingCard`; zero `FavoriteButton` in `FavoritesPageClient` |
| 8 | FavoriteButton login gate on grid | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `FavoriteButton.tsx` L59–61 opens `AuthPromptModal` when `hasSession === false`; no test exercises grid path |
| 9 | No Claim CTA on grid cards (CARD-05, D-24) | ✓ VERIFIED | Zero `ClaimButton`/`ReservedBadge` imports in `ListListingCard.tsx` |
| 10 | Heart click does not trigger card navigation (D-24) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `FavoriteButton` calls `stopPropagation` in `handleClick`; card `article` has `onClick` navigate — no click integration test |
| 11 | Favorites grid passes `distanceMeters` via `useDistanceCenter(false)` + haversine (CARD-02, D-23) | ✓ VERIFIED | `FavoritesPageClient.tsx` L33, L167–175 |
| 12 | Detail routes retain claim/deep-link; grid unchanged (CARD-05) | ✓ VERIFIED | `app/listing/[id]/page.tsx` routes to `ScrapedListingShell` / `UgcListingShell` with claim handlers intact |
| 13 | Trilingual `listing.free` / `listing.reserved` keys wired (I18N-01 partial) | ✓ VERIFIED | en/zh/it keys present; `key-parity.test.ts` 3/3 pass; `ListListingCard` uses `messages.listing.*` |
| 14 | `buildCardMetadata` extracted; `formatDistance` import only — D-30 pipeline untouched | ✓ VERIFIED | `lib/listings/card-metadata.ts` imports `formatDistance`; `FeedHomeClient` still passes `distanceMap` prop |

**Score:** 10/12 truths verified (2 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `lib/listings/card-metadata.ts` | Pure metadata builder | ✓ VERIFIED | 24 lines; exports `buildCardMetadata` |
| `lib/listings/card-metadata.test.ts` | CARD-01/02/D-17/D-19 tests | ✓ VERIFIED | 7 tests, all pass |
| `components/listings/ListListingCard.tsx` | Polished grid card | ✓ VERIFIED | Wired: imported by `FeedHomeClient`, `FavoritesPageClient`, `ListPageClient` |
| `components/listings/FavoritesPageClient.tsx` | Single heart + distance | ✓ VERIFIED | Direct `ListListingCard` render; `gap-3` grid |
| `components/listings/FeedHomeClient.tsx` | distanceMap consumer | ✓ VERIFIED | Passes `distanceMeters={distanceMap.get(listing.id) ?? null}` |
| `messages/{en,zh,it}.ts` | Grid i18n keys | ✓ VERIFIED | `listing.free`, `listing.reserved` in all three locales |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `ListListingCard.tsx` | `lib/listings/card-metadata.ts` | `import { buildCardMetadata }` | ✓ WIRED | No inline duplicate |
| `FeedHomeClient.tsx` | `ListListingCard` | `distanceMeters={distanceMap.get(...)}` | ✓ WIRED | Phase 10 pipeline consumed |
| `FavoritesPageClient.tsx` | `ListListingCard` | `haversineKm` + `useDistanceCenter(false)` | ✓ WIRED | Per-listing `distanceMeters` prop |
| `ListListingCard.tsx` | `FavoriteButton` | In-card overlay with `listingId` | ✓ WIRED | Duplicate wrapper removed from favorites |
| `ListListingCard.tsx` | `messages.listing.reserved` | `reservedLabel` in `buildCardMetadata` | ✓ WIRED | Not hardcoded English |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `ListListingCard` metadata | `metadata` | `buildCardMetadata({ distanceMeters, cityLabel, postedLabel, isClaimed, reservedLabel })` | Yes — derived from listing row + prop + i18n | ✓ FLOWING |
| `FeedHomeClient` cards | `distanceMeters` | `distanceMap.get(listing.id)` from Phase 10 compose pipeline | Yes — haversine map, not hardcoded | ✓ FLOWING |
| `FavoritesPageClient` cards | `distanceMeters` | Per-listing haversine when `center` + lat/lng | Yes — computed at render | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| buildCardMetadata unit tests | `npx vitest run lib/listings/card-metadata.test.ts` | 7/7 pass | ✓ PASS |
| i18n key parity | `npx vitest run messages/key-parity.test.ts` | 3/3 pass | ✓ PASS |
| Zero duplicate hearts in favorites | `rg -c FavoriteButton components/listings/FavoritesPageClient.tsx` | 0 | ✓ PASS |
| buildCardMetadata import in card | `rg buildCardMetadata components/listings/ListListingCard.tsx` | import + usage | ✓ PASS |
| Full lib suite | `npm run test:lib` | 3 failures in `subito-regalo-catalog.test.ts` (pre-existing, out of scope) | ℹ️ INFO |
| Production build | `npm run build` | TS error in `lib/admin/cleanup.ts` (pre-existing, out of scope) | ℹ️ INFO |

### Probe Execution

Step 7c: SKIPPED — no probe scripts declared for Phase 11.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | -------------- | ----------- | ------ | -------- |
| CARD-01 | 01, 02, 04 | Image, title, relative time on grid | ✓ SATISFIED | `ListListingCard` + `buildCardMetadata` tests |
| CARD-02 | 01, 02, 03, 04 | `{distance} · {time}` when center/coords available | ✓ SATISFIED | Feed + favorites distance wiring; unit tests |
| CARD-03 | 02, 04 | FREE badge on scraped and UGC grid images | ✓ SATISFIED | Emerald pill span always rendered |
| CARD-04 | 02, 03, 04 | FavoriteButton with login gate, single heart | ⚠️ NEEDS HUMAN | Code wired; auth/toggle behavior unexercised by test |
| CARD-05 | 02, 04 | No Claim on grid; detail retains claim | ✓ SATISFIED | Grep clean on grid; detail shells unchanged |
| I18N-01 (partial) | 04 | New grid strings in zh/en/it | ✓ SATISFIED | `listing.free`/`reserved` + key-parity green |

All six requirement IDs declared in plan frontmatter are accounted for. No orphaned Phase 11 requirements in REQUIREMENTS.md beyond these IDs.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | None in phase-modified files | — | — |

Scanned `ListListingCard.tsx`, `FavoritesPageClient.tsx`, `card-metadata.ts`, `FeedHomeClient.tsx` — no TBD/FIXME/XXX, no placeholder returns, no hardcoded empty props.

### Human Verification Required

### 1. Grid visual contract (Stitch)

**Test:** Open `/` feed grid and inspect card chrome  
**Expected:** Emerald FREE pill top-left, glass heart top-right, 4:5 portrait, rounded-2xl, compact metadata  
**Why human:** Visual styling cannot be verified by static analysis

### 2. Favorite toggle UX

**Test:** Toggle favorite logged in on feed; attempt while logged out  
**Expected:** Orange filled heart when favorited; toast on add/remove; auth modal when logged out  
**Why human:** CARD-04 auth gate and favorited visual state are runtime behaviors

### 3. Favorites grid parity

**Test:** Open `/favorites` with saved listings and active distance center  
**Expected:** Single heart per card; `{distance} · {time}` metadata when coords + center available  
**Why human:** Center chain depends on browse/GPS consent at runtime

### 4. Claimed listing treatment

**Test:** Locate a claimed listing on feed grid  
**Expected:** Dimmed photo only; full-brightness overlays; metadata suffix shows localized Reserved  
**Why human:** Requires live claimed listing data and visual inspection

### 5. Grid vs detail Claim boundary

**Test:** Confirm no Claim on grid cards; open scraped and UGC detail pages  
**Expected:** Grid has no Claim CTA; detail retains claim/deep-link in action shells  
**Why human:** Detail claim UX requires navigation confirm (grid absence is grep-verified)

### Gaps Summary

No blocking code gaps found. Phase 11 deliverables exist, are substantive, and are wired across feed, favorites, and legacy list routes. Metadata composition is unit-tested. Two behavior-dependent truths (auth gate, navigation isolation) are present and wired but lack automated behavioral proof — routed to human verification per verifier policy.

Pre-existing repo issues (`subito-regalo-catalog.test.ts` failures, `cleanup.ts` TS error) are out of Phase 11 scope and do not block the grid-card goal; they were noted in Plan 04 validation sign-off.

---

_Verified: 2026-08-10T16:31:00Z_  
_Verifier: Claude (gsd-verifier)_
