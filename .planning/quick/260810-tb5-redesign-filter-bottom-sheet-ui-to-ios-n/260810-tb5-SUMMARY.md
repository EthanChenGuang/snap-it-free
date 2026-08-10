---
quick_id: 260810-tb5
status: complete
completed: "2026-08-10"
---

# Quick 260810-tb5: Redesign filter bottom sheet UI to iOS-native

Restyled `components/listings/FilterSheet.tsx` from a desktop-form aesthetic (checkbox list, 4px-radius buttons) to the iOS-native spec: bold title, section-footer helper note, pill city chips, a 3-column category chip grid, and a sticky blurred Reset/Apply bar — pure presentation refactor, all behavior unchanged.

## Changes

- **Task 1 (tracer)** — `DrawerContent` dropped `pb-space-xl`; `DrawerHeader` padding tightened to `px-gutter pb-space-md pt-space-sm`; `DrawerTitle` set to `text-xl`; city section divider removed; helper note restyled to `text-xs text-neutral-400 dark:text-on-surface-variant`; `ConsumerCityChipSelector` converted from `<Button variant="chip">` to plain `<button aria-pressed>` pills (`rounded-full px-4 py-2`, active `bg-primary text-on-primary`, inactive `bg-surface-container`).
- **Task 2** — Category `<ul>/<li>/<label>/<input type="checkbox">` list replaced with `<div className="grid grid-cols-3 gap-2.5">` of plain `<button aria-pressed>` chips (`rounded-xl border`, active `bg-primary text-on-primary border-primary shadow-sm`, inactive `bg-surface-container-low border-outline-variant/60`). `toggleCategory` / `getSubitoCategoryLabel` wiring untouched.
- **Task 3** — `<footer>` relocated from a sibling of the scroll container to its last child, so `sticky bottom-0` + `backdrop-blur-md` actually work. Reset/Apply converted from `<Button>` to plain `<button>` (`py-3.5 rounded-full`, `active:scale-95`); Apply uses `flex-[2]` vs Reset's `flex-1` (2x width). Removed now-unused `Button` import.

All work is a single file (`components/listings/FilterSheet.tsx`), three atomic commits, one per task.

## Deviations from Plan

None — plan executed exactly as written, including all five `<accepted_deviations>` already pre-negotiated against `.planning/google-stitch-ui-design/SKILL.md` (backdrop-blur, rounded-xl chips, shadows on active/primary affordances, `text-neutral-400` helper note, and the 48px drag-handle pill staying as-is).

## Verification

- `npx tsc --noEmit` — FilterSheet.tsx itself has zero errors after every task. The command as a whole reports pre-existing errors in unrelated dirty files (`lib/admin/cleanup.ts`, `lib/i18n/listing-fields.test.ts`, `lib/listings/subito-categories.ts`, `scraper-admin/*`) that predate this task and are out of scope per the deviation-rule scope boundary (matches STATE.md's already-documented "pre-existing admin test/build debt ... not blocking gates").
- `npm run test` — 307/310 tests pass; the 3 failures are all in `lib/admin/subito-regalo-catalog.test.ts` (pre-existing Padova-spike-verdict debt, unrelated to this component, not touched by this plan).
- All structural greps in each task's `<verify><automated>` block passed: `aria-pressed`, pill/chip geometry, i18n hint sourcing, dark-mode counterpart, no drag-handle duplication, category grid + `rounded-xl`, no checkbox/`<li>` survivors, `toggleCategory`/`getSubitoCategoryLabel` intact, `backdrop-blur-md`, `flex-[2]` (and no invalid unbracketed `flex-2`), no hardcoded CJK strings, all four i18n keys (`filtersTitle`, `cityFilterMapHint`, `resetFilters`, `applyFilters`) and all four `FeedFilterContext` bindings (`applyDraft`, `resetFilters`, `resetDraftFromApplied`, `setDraft`) present.
- `git diff components/listings/FilterSheet.tsx` confined to `className` strings, the list→grid element swap, and the footer relocation — no `useFeedFilter` call-site changes.
- Only `components/listings/FilterSheet.tsx` was staged in every commit; `components/ui/drawer.tsx` and `messages/*.ts` remain untouched/dirty as required.

## Pending Human Verification

Task 3's `<human-check>` was not run (no browser available in this environment). Still pending: `npm run dev` → open `/list` → tap filter control → confirm in both light and dark mode: single drag pill, bold title, gray helper note, solid black/white active city pills, 3-column category grid with no checkboxes and legible wrapped labels, pinned+blurred Reset/Apply bar visible while grid scrolls beneath it, Apply ~2x Reset's width, Tab/Enter keyboard operability on every chip, and Apply/Reset still commit/clear filters correctly.

## Self-Check: PASSED

- FOUND: components/listings/FilterSheet.tsx
- FOUND: .planning/quick/260810-tb5-redesign-filter-bottom-sheet-ui-to-ios-n/260810-tb5-SUMMARY.md
- FOUND: 25da598 (Task 1 commit)
- FOUND: 47d5259 (Task 2 commit)
- FOUND: 29b1c72 (Task 3 commit)
