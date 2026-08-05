---
quick_id: 260805-ots
mode: quick-full
description: Add admin action to delete out-of-date scraper records from the database
must_haves:
  truths:
    - Operator can preview counts of out-of-date records from admin dashboard
    - Operator must confirm before hard-delete executes
    - Expired listings, old hidden scraper listings, and audit rows older than 30 days are removed
  artifacts:
    - lib/admin/cleanup.ts
    - app/api/admin/cleanup/route.ts
    - components/admin/MaintenanceCard.tsx
  key_links:
    - DashboardClient renders MaintenanceCard
    - POST /api/admin/cleanup gated by requireOperatorSession
    - executeCleanup uses createServiceClient after operator auth
---

# Quick Plan 260805-ots

## Task 1: Cleanup logic + API

**files:** `lib/admin/cleanup.ts`, `lib/admin/schemas.ts`, `app/api/admin/cleanup/route.ts`, `lib/admin/cleanup.test.ts`

**action:**
- Add `getCleanupPreview()` counting expired listings, hidden scraper listings (source != ugc, scraped_at > 30d), old scrape_rejects, old scrape_runs
- Add `executeCleanup()` performing ordered deletes; return deleted counts
- Zod schema for POST `{ confirm: true }`
- GET preview, POST execute routes with operator gate + service client

**verify:** `npm test -- lib/admin/cleanup.test.ts`

**done:** Preview and execute functions tested; API routes return JSON counts

## Task 2: Dashboard maintenance card

**files:** `components/admin/MaintenanceCard.tsx`, `components/admin/DashboardClient.tsx`

**action:**
- Maintenance card below global status row: "Database cleanup" with Preview button
- Show count breakdown; Enable "Delete" after preview with window.confirm
- POST execute on confirm; show result summary; router.refresh()

**verify:** Typecheck passes; card matches Stitch admin border/spacing patterns

**done:** Dashboard shows maintenance card wired to cleanup API
