---
quick_id: 260805-nx4
status: complete
---

# Summary: Fix invisible black-on-black text on selected filter chips

## Result

`lib/utils.ts`'s `cn()` now uses `extendTailwindMerge` (instead of plain
`twMerge`) registered with this app's custom `@theme` font-size scale
(`h1`, `h2`, `h3`, `body-lg`, `body-md`, `label-md`, `label-sm`). Selected
filter chips (map zone filter, list category filter, Settings zone selector)
now keep their `text-on-primary`/`text-on-surface` color class instead of
silently losing it during class merging.

## Root cause (as diagnosed in the plan, confirmed correct)

Plain `twMerge` has no knowledge of this app's custom `text-*` font-size
scale, so it pattern-matches `text-label-sm`/`text-label-md` (font-size
classes) into the same conflict group as real `text-*` color classes like
`text-on-primary`/`text-on-surface`. Because `buttonVariants` concatenates
`size`'s classes (containing `text-label-sm`) after `variant`'s classes
(containing `text-on-primary`), `twMerge` kept the later class and dropped
the color class — text then inherited a near-black ancestor color, landing
invisible on the black `bg-primary` chip background. Confirmed by reproducing
this exact drop with the real `tailwind-merge` import before the fix, and
by reverting the fix and re-running the new regression test (both failed as
expected — see Verification).

## Fix

- **`lib/utils.ts`**: replaced the plain `twMerge` import with a module-level
  `extendTailwindMerge({ extend: { theme: { text: [...] } } })` instance
  configured with the app's custom text scale keys (minus the `text-`
  prefix), per `tailwind-merge`'s documented custom-font-size recipe
  (confirmed against `tailwind-merge` v3 docs via Context7). `cn()`'s
  signature and every other call site are unchanged.
- No other file needed to change — `components/ui/button.tsx` and the three
  chip components were already correct; the bug was entirely in the shared
  merge config they all route through.

## Verification

- `npx vitest run lib/utils.test.ts` — 4/4 new regression tests pass:
  active-chip (`text-on-primary`) survives merge, inactive-chip
  (`text-on-surface`) survives merge, genuine same-scale conflict
  (`text-label-md`/`text-label-sm`) still resolves to the later class, and
  ordinary Tailwind conflict resolution (`px-2 px-4` → `px-4`) is unaffected.
- Confirmed the test actually catches the bug: temporarily reverted
  `lib/utils.ts` to plain `twMerge` and re-ran the suite — the two
  color-survival assertions failed exactly as predicted, then restored the
  fix and re-confirmed all 4 pass.
- `npx vitest run lib/` — full lib suite: 38 files / 185 tests, all pass, no
  regressions from the merge-config change.
- `npm run lint` (`tsc --noEmit`): no errors introduced by this change.
  Pre-existing, unrelated errors in `lib/i18n/listing-fields.test.ts` and
  `scraper-admin/*` are untouched by this fix and out of scope (logged below,
  not fixed, per scope-boundary rule).
- **Not performed:** live browser visual confirmation on the map explorer and
  list page (Task 3's manual step). No browser/display was available in this
  execution environment. The regression test suite directly encodes and
  verifies the exact class-merge behavior responsible for the visible bug,
  so this is a acceptable stand-in, but a human should still eyeball the
  selected chips (map zone filter, list category filter, Settings zone
  selector) in both light and dark mode before considering this fully closed.

## Out-of-scope items (not fixed, pre-existing)

- `lib/i18n/listing-fields.test.ts`: 5 `tsc` errors, missing required `title`
  property on `ListingFieldRow` test fixtures — pre-existing, unrelated to
  `cn()`/tailwind-merge.
- `scraper-admin/src/components/Sidebar.tsx`, `scraper-admin/src/main.tsx`,
  `scraper-admin/vite.config.ts`: pre-existing `tsc` errors in an unrelated
  sub-project.

## Files changed

- `lib/utils.ts` — `cn()` now backed by `extendTailwindMerge` with the app's
  custom font-size scale registered
- `lib/utils.test.ts` (new) — regression suite locking in the fix

## Self-Check: PASSED

- FOUND: `lib/utils.ts`
- FOUND: `lib/utils.test.ts`
- FOUND: `.planning/quick/260805-nx4-fix-invisible-black-on-black-text-on-sel/260805-nx4-SUMMARY.md`
- FOUND: commit `6faef7a`
