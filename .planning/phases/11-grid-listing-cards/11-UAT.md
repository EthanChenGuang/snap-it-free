---
status: complete
phase: 11-grid-listing-cards
source: [11-VERIFICATION.md, scripts/phase11-uat-automation.mjs]
started: 2026-08-10T16:32:00Z
updated: 2026-08-10T17:35:00Z
tested_by: automated-playwright
---

## Current Test

[testing complete]

## Tests

### 1. Grid visual contract (Stitch)
expected: Emerald FREE pill top-left, glass heart top-right, 4:5 portrait, rounded-2xl, compact metadata on every card
result: pass
source: automated
notes: FREE badge bg-emerald, heart backdrop-blur overlay, aspect-[4/5], line-clamp-1 title, text-xs metadata verified on feed card.

### 2. Favorite toggle + auth gate
expected: Logged in — orange filled heart when favorited, toast on add/remove. Logged out — auth modal opens, no toggle
result: pass
source: automated
notes: Logged-out heart opens auth dialog ("Sign in to save favorites") without navigation. Authed session toggles heart (aria-pressed=true, orange fill) without card navigation.

### 3. Favorites grid parity
expected: `/favorites` shows single heart per card (no duplicate overlay); metadata shows `{distance} · {time}` when center + coords available
result: pass
source: automated
notes: Single heart per card; metadata "0 m · Just now" with browse center active; grid gap 12px (gap-3).

### 4. Claimed listing treatment
expected: Photo dimmed (opacity on ListingPhoto only); FREE badge and heart full brightness; metadata ends with localized Reserved suffix
result: pass
source: automated
notes: img opacity 0.6; FREE/heart opacity 1.0; metadata includes "· Reserved" suffix.

### 5. Grid vs detail Claim boundary
expected: No Claim CTA on grid cards; detail pages retain claim/deep-link actions in ScrapedListingShell / UgcListingShell
result: pass
source: automated
notes: Zero Claim buttons in grid; detail shell contains claim/claimed copy after card navigation.

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
