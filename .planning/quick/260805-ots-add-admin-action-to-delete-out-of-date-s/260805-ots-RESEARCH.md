# Quick Task 260805-ots — Research

**Task:** Add admin action to delete out-of-date scraper records from the database

## Findings

### Existing lifecycle
- `listings.status` enum: `active`, `claimed`, `expired`, `hidden`
- Cron job `expire-stale-listings` (migration 005) **soft-flips** `active → expired` when `expires_at < now()` — does not hard-delete
- Map/UI already hides expired rows via `listings_public` view and query filters
- Scraper does **not** mark delisted items; "inactive" housekeeping = `expired` + old `hidden` scraper rows

### Audit tables
- `scrape_runs` + `scrape_rejects` (migration 003); Phase 6 added `scrape_runs.source`
- No operator RLS on audit tables — bulk delete requires **service role** after operator session gate
- `scrape_rejects.scrape_run_id` FK has no CASCADE — delete rejects before runs (or delete rejects by `created_at`)

### Admin patterns
- Operator gate: `requireOperatorSession()` in `lib/admin/operator-route.ts`
- Service role: `createServiceClient()` in `lib/supabase/service.ts`
- Dashboard: `DashboardClient.tsx` — bordered sections, Material Symbols, Stitch tokens
- API mutations: Zod schema in `lib/admin/schemas.ts`, JSON responses

### Recommended approach
1. `lib/admin/cleanup.ts` — preview counts + execute deletes (30-day audit retention default)
2. `GET/POST /api/admin/cleanup` — preview / execute (POST requires `{ confirm: true }`)
3. `MaintenanceCard` on dashboard — preview → confirm dialog → execute → toast/refresh

### Pitfalls
- Do not delete UGC `hidden` listings in inactive pass — filter `source != 'ugc'`
- Delete `translation_queue` rows cascade when listing deleted (FK on delete cascade)
- Run rejects cleanup before runs when deleting by run age
