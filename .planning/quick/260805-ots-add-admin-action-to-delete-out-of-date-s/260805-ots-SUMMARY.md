---
quick_id: 260805-ots
status: complete
date: 2026-08-05
---

# Quick Task 260805-ots — Summary

Add admin action to delete out-of-date scraper records from the database.

## Done

- `lib/admin/cleanup.ts` — preview counts + ordered hard-delete (expired listings, old hidden scraper listings, audit rows >30d)
- `GET/POST /api/admin/cleanup` — operator-gated preview and execute (`confirm: true`)
- `MaintenanceCard` on `/admin` dashboard — preview → confirm dialog → delete
- Unit tests for preview aggregation

## Decisions honored

- All out-of-date types (expired, inactive/hidden scraper, old audit)
- Dashboard placement
- Preview + confirm before delete
- 30-day audit retention (Claude discretion on scope)

## Verify manually

1. Sign in as operator → `/admin`
2. Click **Preview cleanup** — counts appear
3. Click **Delete out-of-date records** — confirm dialog → records removed
