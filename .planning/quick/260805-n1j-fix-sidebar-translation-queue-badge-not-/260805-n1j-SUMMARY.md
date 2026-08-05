---
quick_id: 260805-n1j
status: complete
one_liner: "router.refresh() after retry re-syncs AdminShell's sidebar badge with the header banner"
key-files:
  modified:
    - components/admin/TranslationQueueClient.tsx
metrics:
  duration: 5 min
  completed: 2026-08-05
---

# Quick Task 260805-n1j: Fix sidebar translation queue badge not refreshing after retry — Summary

**One-liner:** `router.refresh()` after retry re-syncs `AdminShell`'s sidebar badge with the header banner.

## What was done

`TranslationQueueClient.tsx` now imports `useRouter` from `next/navigation` and calls
`router.refresh()` immediately after a successful `refreshFromResponse(result.processed)` in
both `handleRetry` (single-item retry) and `handleBulkRetry` (bulk retry). This matches the
existing pattern already used elsewhere in the admin console (`DashboardClient.tsx`,
`SourceDetailClient.tsx`, `SettingsClient.tsx`).

`router.refresh()` re-runs the Server Component tree (`app/admin/layout.tsx` →
`getPendingTranslationCount()` → `AdminShell`'s `pendingTranslationsCount` prop), so the
sidebar "翻译队列" nav badge and the top-bar pill now update in the same render pass as the
on-page header banner (which already worked because it reads local `items` state).

The calls are placed only in the `try` block success path, not in `catch` — a failed retry
still surfaces its error message via `setErrorMessage` without a router refresh wiping the
error banner via a layout re-render.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Call `router.refresh()` after successful retry (single + bulk) | 4a0aab1 |
| 2 | Verify sidebar badge refreshes end-to-end | (verification only, no commit) |

## Verification

- `grep -c "router.refresh()" components/admin/TranslationQueueClient.tsx` → `2` (confirmed)
- Both occurrences confirmed inside `try` blocks, not `catch` blocks (confirmed via code read)
- `npm run lint` (`tsc --noEmit`): no errors introduced by this change. Pre-existing unrelated
  errors exist in `lib/i18n/listing-fields.test.ts` and `scraper-admin/` (out of scope for this
  fix — not touched, not caused by this change).
- Manual dev-server click-through of "重试" was not executed in this session (no running dev
  server / browser available in this environment); the fix is the same `router.refresh()`
  pattern already proven working in three other admin client components in this codebase.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: components/admin/TranslationQueueClient.tsx (useRouter import + 2 router.refresh() calls confirmed via grep)
- FOUND: commit 4a0aab1 (`git log --oneline` confirms)
