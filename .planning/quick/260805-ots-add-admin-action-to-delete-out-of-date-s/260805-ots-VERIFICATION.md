---
status: passed
quick_id: 260805-ots
date: 2026-08-05
---

# Quick Task 260805-ots — Verification

## must_haves

| Truth | Status | Evidence |
|-------|--------|----------|
| Operator can preview counts from dashboard | PASS | `MaintenanceCard` → `GET /api/admin/cleanup` |
| Confirm required before delete | PASS | `window.confirm` + POST `{ confirm: true }` schema |
| Expired + hidden scraper + audit cleanup | PASS | `getCleanupPreview` / `executeCleanup` in `lib/admin/cleanup.ts` |

## Artifacts

- [x] `lib/admin/cleanup.ts`
- [x] `app/api/admin/cleanup/route.ts`
- [x] `components/admin/MaintenanceCard.tsx`
- [x] `DashboardClient` renders card

## Tests

- `lib/admin/cleanup.test.ts` — 2 passed

## Human check

- Run preview/delete against a dev Supabase instance with `SUPABASE_SERVICE_ROLE_KEY` set
