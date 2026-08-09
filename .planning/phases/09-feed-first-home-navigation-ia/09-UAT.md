---
status: testing
phase: 09-feed-first-home-navigation-ia
source: [09-VERIFICATION.md]
started: 2026-08-09T12:15:00Z
updated: 2026-08-09T12:15:00Z
---

## Current Test

number: 1
name: Feed grid at mobile width — open / at 375px
expected: |
  Two-column Stitch feed grid of ListListingCard tiles; no MapLibre canvas on home.
awaiting: user response

## Tests

### 1. Feed grid at mobile width
expected: Open `/` at 375px; 2-col grid visible, not map home.
result: [pending]

### 2. Post auth gate (logged out)
expected: Tap Post tab; AuthPromptModal opens; navigation to /post blocked until auth.
result: [pending]

### 3. Scroll-away feed header
expected: Scroll feed down — FeedHeaderRow hides; scroll up — returns; bottom nav stays fixed.
result: [pending]

### 4. Filter toast stub
expected: Tap tune icon in feed header; trilingual toast "Filters coming soon" per locale.
result: [pending]

### 5. Favorites 2-col grid (logged in)
expected: Favorites tab shows grid with ListListingCard + working heart unfavorite.
result: [pending]

### 6. Settings chrome + manage posts
expected: SimpleTitleBar shows 手慢无; manage-posts link navigates to /post/manage when signed in.
result: [pending]

### 7. Select-location flow
expected: Feed → location icon → map loads with fixed pin + zone chips → Confirm persists browse center → returns to /.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
