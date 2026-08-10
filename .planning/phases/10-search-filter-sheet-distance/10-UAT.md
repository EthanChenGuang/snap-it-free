---
status: complete
phase: 10-search-filter-sheet-distance
source: [10-VERIFICATION.md, scripts/phase10-uat-automation.mjs]
started: 2026-08-10T15:12:00Z
updated: 2026-08-10T15:18:00Z
tested_by: automated-playwright
---

## Current Test

[testing complete]

## Tests

### 1. Filter sheet draft/Apply/Reset flow (FILT-02)
expected: Change city in sheet, close without Apply → prefs unchanged; Apply → city persisted; Reset → city All, categories cleared, browse center cleared.
result: pass
source: automated
notes: Draft Padova discarded on navigate-away + reopen shows All selected; Apply sets mode=city city=padova; Reset clears prefs and browse center. Radius controls live on /select-location per filter-mode-mutual-exclusivity quick task.

### 2. Active filter pills dismiss (FILT-03)
expected: Search + category pills appear; dismiss updates feed; flex-wrap on narrow viewport.
result: pass
source: automated
notes: Search pill + category pill visible after Apply; flex-wrap confirmed; dismiss clears search input and category prefs. Center/radius pills moved to map pin indicator (D-01 refactor).

### 3. Map pin mode + select-location confirm (FILT-05 / D-07)
expected: Confirm location → map mode + browse center persisted + pin indicator; Reset clears map mode.
result: pass
source: automated
notes: Confirm sets mode=map radiusEnabled=true + shoumanwu_browse_center; red dot on pin button; Reset returns to city mode and clears center.

### 4. Drawer height vs bottom nav (FILT-01)
expected: Filter sheet max-h ~85vh; sticky footer visible; bottom nav not fully obscured.
result: pass
source: automated
notes: Drawer h≈690px at 812 viewport; Apply/Reset footer visible; bottom nav link remains visible (drawer uses bottom-16 offset).

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]

## Superseded Expectations (post-Phase-10 quick tasks)

- **Radius in filter sheet:** Removed per `260810-filter-mode-mutual-exclusivity` — radius pills on `/select-location` only.
- **Center/radius/city pills in header row:** City filter via sheet; map/radius indicated by pin button red dot; active pills are search + categories only.
- **Draft dismiss via swipe:** Automated via navigate-away (Settings → Home) when Vaul swipe unreliable in headless mode; same draft/applied semantics.

## Deferred Follow-Ups

[none]
