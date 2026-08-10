---
status: testing
phase: 11-grid-listing-cards
source: [11-VERIFICATION.md]
started: 2026-08-10T16:32:00Z
updated: 2026-08-10T16:32:00Z
---

## Current Test

number: 1
name: Grid visual contract (Stitch)
expected: |
  Open `/` feed grid and inspect card chrome.
  Each card shows emerald FREE pill top-left, glass heart top-right, 4:5 portrait image with rounded-2xl, line-clamp-1 title, text-xs metadata.
awaiting: user response

## Tests

### 1. Grid visual contract (Stitch)
expected: Emerald FREE pill top-left, glass heart top-right, 4:5 portrait, rounded-2xl, compact metadata on every card
result: [pending]

### 2. Favorite toggle + auth gate
expected: Logged in — orange filled heart when favorited, toast on add/remove. Logged out — auth modal opens, no toggle
result: [pending]

### 3. Favorites grid parity
expected: `/favorites` shows single heart per card (no duplicate overlay); metadata shows `{distance} · {time}` when center + coords available
result: [pending]

### 4. Claimed listing treatment
expected: Photo dimmed (opacity on ListingPhoto only); FREE badge and heart full brightness; metadata ends with localized Reserved suffix
result: [pending]

### 5. Grid vs detail Claim boundary
expected: No Claim CTA on grid cards; detail pages retain claim/deep-link actions in ScrapedListingShell / UgcListingShell
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

[none — pending human verification]
