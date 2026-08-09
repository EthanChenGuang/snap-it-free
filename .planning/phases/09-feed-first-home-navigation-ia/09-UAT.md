---
status: complete
phase: 09-feed-first-home-navigation-ia
source: [09-VERIFICATION.md, scripts/phase9-uat-automation.mjs]
started: 2026-08-09T12:15:00Z
updated: 2026-08-09T14:06:00Z
tested_by: automated-playwright
---

## Current Test

[testing complete]

## Tests

### 1. Feed grid at mobile width
expected: Open `/` at 375px; 2-col grid visible, not map home.
result: pass
source: automated
notes: Feed-first home at 375px; no MapLibre canvas. Grid renders seeded listings (grid-cols-2 + ListListingCard).

### 2. Post auth gate (logged out)
expected: Tap Post tab; AuthPromptModal opens; navigation to /post blocked until auth.
result: pass
source: automated
notes: Post tab click opened "Sign in to continue" dialog; URL remained `/`.

### 3. Scroll-away feed header
expected: Scroll feed down — FeedHeaderRow hides; scroll up — returns; bottom nav stays fixed.
result: pass
source: automated
notes: Incremental scroll toggles headerHidden (opacity-0 / translate-y); bottom nav remained visible.

### 4. Filter toast stub
expected: Tap tune icon in feed header; trilingual toast "Filters coming soon" per locale.
result: pass
source: automated
notes: EN locale — toast "Filters coming soon" appeared.

### 5. Favorites 2-col grid (logged in)
expected: Favorites tab shows grid with ListListingCard + working heart unfavorite.
result: pass
source: automated
notes: Password-auth session + user_favorites seed; 2-col grid visible; heart aria-pressed true→false; "Removed from favorites" toast. Required applying migration 021 (listings_public description columns) to remote Supabase.

### 6. Settings chrome + manage posts
expected: SimpleTitleBar shows 手慢无; manage-posts link navigates to /post/manage when signed in.
result: pass
source: automated
notes: Title 手慢无 confirmed; manage link href=/post/manage; signed-in navigation to /post/manage verified.

### 7. Select-location flow
expected: Feed → location icon → map loads with fixed pin + zone chips → Confirm persists browse center → returns to /.
result: pass
source: automated
notes: Map canvas + zone chips + Confirm → shoumanwu_browse_center persisted; navigated to /.

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-09-7
  truth: "Select-location route loads map picker with zone chips and Confirm persists browse center"
  status: resolved
  resolved_at: 2026-08-09T13:27:00Z
  fix: "09-05 — SelectLocationMapPane split; lifecycle-safe map init; readBrowseCenter snapshot cache; verify-select-location-dev.mjs"
  severity: blocker
  test: 7
  root_cause: "Dev webpack chunk hydration + mount useEffect flyTo race; writeBrowseCenter triggered useSyncExternalStore infinite loop due to uncached readBrowseCenter snapshots"
  artifacts:
    - components/map/SelectLocationMapPane.tsx
    - components/map/SelectLocationClient.tsx
    - lib/browse-center/storage.ts
    - scripts/verify-select-location-dev.mjs

- gap_id: G-09-5
  truth: "Favorites grid loads listing cards for authenticated users with saved favorites"
  status: resolved
  resolved_at: 2026-08-09T14:06:00Z
  fix: "Applied Supabase migration 021_listings_public_description — listings_public view missing description columns caused fetchListingsByIdsClient 400"
  severity: major
  test: 5
  root_cause: "Migration 021 not applied to remote DB; client query selected description/description_en/description_zh columns absent from view"

## Deferred Follow-Ups

[none]
