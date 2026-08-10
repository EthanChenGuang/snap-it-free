---
status: testing
phase: 10-search-filter-sheet-distance
source: [10-VERIFICATION.md]
started: 2026-08-10T15:20:00+02:00
updated: 2026-08-10T15:20:00+02:00
---

## Current Test

number: 1
name: Filter sheet draft/Apply/Reset flow (FILT-02)
expected: |
  Change radius in sheet, close without Apply → no feed change; Apply → pills update and prefs persist; Reset → radius off, city All, categories cleared (browse center and search unchanged)
awaiting: user response

## Tests

### 1. Filter sheet draft/Apply/Reset flow (FILT-02)
expected: Change radius in sheet, close without Apply → no feed change; Apply → pills update and prefs persist; Reset → radius off, city All, categories cleared (browse center and search unchanged)
result: [pending]

### 2. Active filter pills dismiss in order (FILT-03)
expected: Pills appear Search → Center → Radius → City → Categories; each × dismiss updates feed immediately; flex-wrap on narrow viewport
result: [pending]

### 3. Center pill + GPS fallback (FILT-05)
expected: Clear center → one-shot GPS or Venice default; confirm location → immediate re-filter and center pill label
result: [pending]

### 4. Drawer height vs bottom nav (FILT-01)
expected: Filter sheet max-h ~85vh; sticky footer visible; bottom nav capsule not fully obscured
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
