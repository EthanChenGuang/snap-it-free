---
status: complete
phase: 13-select-location-flow
source: 13-01-SUMMARY.md, 13-02-SUMMARY.md, 13-03-SUMMARY.md, 13-04-SUMMARY.md, 13-05-SUMMARY.md
started: 2026-08-11T07:37:00Z
updated: 2026-08-11T07:46:00Z
tester: agent-autonomous
environment: production build on localhost:3004
---

## Current Test

[testing complete]

## Tests

### 1. Shared resolveCityLabel and post-draft storage (unit)
expected: resolveCityLabel returns Venice/Padova by nearest centroid; readPostDraft/writePostDraft round-trip on shoumanwu_post_draft with validation
result: pass
source: automated
coverage_id: 13-01-D1, 13-01-D2

### 2. I18N key parity for location-flow strings
expected: postTitle, confirmPickup, locationRowPending, locationRequiredError present in zh/en/it
result: pass
source: automated
coverage_id: 13-02-D3, 13-04-D3

### 3. Integration audit boundaries (grep/static)
expected: AppChrome pathname gate, FeedHeaderRow browse entry, tagZone-only zone derivation, RedPin untouched, no mount writes on back
result: pass
source: automated
coverage_id: 13-04-D1

### 4. Live city preview with aria-live
expected: Preview row shows Venice or Padova matching pin position; aria-live="polite"; updates when pin moves to a different centroid zone
result: pass
source: agent-browser
notes: Browse context showed Venice at default center; post context showed Padova after locate-me FAB moved pin; lagoon reposition still correctly resolves Venice

### 5. Confirm button disabled until map ready
expected: Confirm disabled with reduced opacity before map bootstrap; enabled once ready=true
result: pass
source: agent-browser
notes: Observed disabled=true from ~250ms after navigation until map loaded; enabled once preview text appeared

### 6. Post-context round trip
expected: /select-location?context=post hides radius UI; Confirm writes shoumanwu_post_draft and returns to /post with city label; browse localStorage prefs unchanged
result: pass
source: agent-browser
notes: Title "Set pickup location", button "Confirm pickup location", no radius chips; returned to PostForm showing "Padova"; sessionStorage {"lat":45.4064,"lng":11.8768,"label":"Padova","locationConfirmed":true}; browseCenter/filterPrefs unchanged

### 7. Stitch flat-card styling on floating controls
expected: Confirm panel rounded-lg with border-outline-variant, no heavy drop shadow; radius chips solid bg; locate-me FAB border-only circle
result: pass
source: agent-browser
notes: panelShadow none, panelRadius 8px, fabShadow none, fab border present, chip backdropFilter none, solid white chip background

### 8. Back without Confirm — no storage writes
expected: Leaving browse picker without Confirm leaves shoumanwu_browse_center and shoumanwu_map_filter_prefs unchanged
result: pass
source: agent-browser
notes: Seeded browseCenter/filterPrefs survived history.back() from picker without confirm

### 9. Browse context chrome
expected: Full-viewport map with radius chips and locate-me FAB; AppChrome header/bottom nav hidden on /select-location
result: pass
source: agent-browser
notes: Radius chips 5/10/50/100 km visible in browse; bottom nav absent in select-location screenshots; restored on /post

### 10. Locate-me FAB moves pin
expected: Tapping locate-me repositions map pin and updates preview contextually
result: pass
source: agent-browser
notes: Pin visibly repositioned on map after FAB click with geolocation mocked

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Deferred Follow-Ups

- test: n/a
  idea: "D-12 PostForm photo/title/description reset on navigate-out-and-back to picker — documented open developer decision, not blocking LOC-01–03"
  deferred_at: 2026-08-11

## Gaps

[none]
