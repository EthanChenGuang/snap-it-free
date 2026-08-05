# Quick Task 260805-ots: Add admin action to delete out-of-date scraper records from the database - Context

**Gathered:** 2026-08-05
**Status:** Ready for planning

<domain>
## Task Boundary

Add admin action to delete out-of-date scraper records from the database

</domain>

<decisions>
## Implementation Decisions

### What counts as "out-of-date"
- **All types:** expired listings, inactive/delisted listings, and old audit rows (runs/rejects)

### Admin UI placement
- **Dashboard maintenance card** on main `/admin` dashboard

### Safety & confirmation
- **Preview counts + confirm dialog** before executing delete

### Database scope (Claude's discretion)
- **Listings:** hard-delete rows with `status = 'expired'`; also delete `hidden` scraper-sourced listings older than 30 days (inactive/delisted housekeeping — UGC hidden rows excluded)
- **Audit:** hard-delete `scrape_runs` and dependent `scrape_rejects` older than **30 days** (default retention)
- Preview endpoint returns counts per category; execute endpoint requires explicit confirm after preview

### Claude's Discretion
- Retention default (30 days for audit rows)
- Exact Stitch styling for maintenance card (match existing admin dashboard patterns)
- Whether to expose retention days in UI (optional; default hidden at 30)

</decisions>

<specifics>
## Specific Ideas

- Reuse existing operator auth (`getOperatorSession`) and admin API route patterns
- Follow Google Stitch monochrome document-first admin aesthetic

</specifics>

<canonical_refs>
## Canonical References

- Phase 6 context: `.planning/phases/06-scraper-admin-console-configurable-sources-frequency-anti-bl/06-CONTEXT.md`
- Existing expire cron: `supabase/migrations/005_expire_listings_cron.sql` (soft status flip only — this task adds hard delete)

</canonical_refs>
