---
phase: quick-260811-gxy
plan: 01
subsystem: feed-filter
tags: [filter-sheet, instant-apply, feed-filter-context]
status: complete
dependency-graph:
  requires: []
  provides: [FeedFilterContext.setCity, FeedFilterContext.toggleCategory, FeedFilterContext.clearCategories]
  affects: [components/listings/FilterSheet.tsx, components/shell/FeedFilterContext.tsx]
tech-stack:
  added: []
  patterns: [instant-commit-write-through-context, useSyncExternalStore-reactive-read]
key-files:
  created: []
  modified:
    - components/shell/FeedFilterContext.tsx
    - components/listings/FilterSheet.tsx
decisions:
  - "Removed draft filter buffer entirely — every chip tap writes straight to applied via writeFilterPrefs/applyCityFilterPrefs"
  - "应用 (Apply) is now close-only; 重置 (Reset) behavior is byte-identical to before"
  - "Swipe/close-without-Apply now preserves just-tapped filters instead of discarding them (intentional behavior change per INSTANT-05)"
metrics:
  duration: 12min
  completed: 2026-08-11
---

# Quick Task 260811-gxy: Make the filter sheet apply instantly Summary

Replaced the draft-then-Apply buffering model in the consumer filter sheet with per-tap instant commits, so 城市/分类 chip taps update the feed list live behind the still-open sheet.

## What Changed

`FeedFilterContext.tsx` previously held a parallel `draft` state that only synced into the real `applied` filter state when 应用 was tapped (`applyDraft`), and re-synced from `applied` whenever the sheet opened/closed (`resetDraftFromApplied`). This meant nothing visibly changed in the feed until Apply was pressed, and swipe-dismissing the sheet silently discarded any taps.

The draft model is now fully removed. Three new instant-commit functions on `FeedFilterContext` write directly to `applied` on every tap:

- `setCity(city)` — preserves the exact collapsed map-mode branching condition that used to live inside `applyDraft` (`applied.mode === 'map' && city === 'all'` decides between a mode-preserving `writeFilterPrefs` call and a full `applyCityFilterPrefs` city-switch), but evaluated against the incoming tap value instead of a stale draft.
- `toggleCategory(slug)` — same instant-write shape as the pre-existing `dismissCategory`.
- `clearCategories()` — instant-writes `categories: []`.

`FilterSheet.tsx` now destructures `applied`, `setCity`, `toggleCategory`, `clearCategories` from the context instead of `draft`/`setDraft`/`resetDraftFromApplied`/`applyDraft`. Chip highlighting reads `applied` directly. 应用's `onClick` is now `() => setSheetOpen(false)` — a close-only action, since every tap already committed. 重置 and its `resetFilters()` wiring are untouched. The `useEffect` that used to rehydrate `draft` from `applied` on sheet open is deleted, and `handleOpenChange` no longer discards anything on close — this is what makes swipe-dismiss preserve just-tapped filters (INSTANT-05).

`FeedHomeClient.tsx` and `FeedHeaderRow.tsx` needed zero changes — they already read only `applied` via `useSyncExternalStore`, so the live feed update comes for free once `applied` starts changing per tap instead of once per Apply.

## Verification

- `npx tsc --noEmit`: clean, zero errors.
- `npm test` (full vitest suite): 354/354 tests passed across 58 files, no regressions.
- Structural greps (both tasks): confirmed zero remaining references to `draft`/`setDraft`/`applyDraft`/`resetDraftFromApplied` in either file, and confirmed the new instant-commit wiring (`setCity`, `toggleCategory`, `clearCategories`, collapsed map-mode branch) is present.
- Live browser verification against the running dev server (`http://localhost:3003`), walking through all 6 human-check scenarios from the plan:
  1. Tapping "Venice" instantly filtered the feed from 43 → 12 items, sheet stayed open, no Apply needed.
  2. Tapping "Pets" category instantly filtered further to 4 items, sheet stayed open.
  3. Tapping "Pets" again instantly deselected it, list returned to 12 items live.
  4. Tapping "Reset" instantly cleared all filters (back to 43 items), sheet stayed open.
  5. Tapping "Venice" then dismissing the sheet without tapping Apply (Escape key, equivalent close path to swipe) left the feed filtered to the 12 Venice items — the tap was preserved, not discarded. Reopening the sheet showed the Venice chip still highlighted, confirming highlighting reads live from `applied`.
  6. Reopening the sheet with Venice still active and tapping "Apply" closed the sheet with the list unchanged before/after (still 12 Venice items) — Apply performed no filter write, only a close.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched their `<action>` specs precisely, including the exact collapsed map-mode branching condition called out in recon finding 1.

## Self-Check: PASSED

- FOUND: `components/shell/FeedFilterContext.tsx`
- FOUND: `components/listings/FilterSheet.tsx`
- FOUND: commit `63846a3` (Task 1)
- FOUND: commit `f4b1fb0` (Task 2)
