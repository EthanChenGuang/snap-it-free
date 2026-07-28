---
status: testing
phase: 01-scraper-foundation-listing-data-model
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
started: 2026-07-28T09:35:00Z
updated: 2026-07-28T09:35:00Z
---

## Current Test

number: 1
name: Apply Supabase migrations and confirm schema
expected: |
  Tables listings, scrape_runs, scrape_rejects visible in Supabase Dashboard with listing_source, listing_status, venice_zone enums and GiST index on geom; PostGIS extension enabled
awaiting: user response

## Tests

### 1. Apply Supabase migrations and confirm schema
expected: Tables listings, scrape_runs, scrape_rejects visible with enums and GiST index; PostGIS enabled
result: pending

### 2. Live E2E worker run with Supabase credentials
expected: Configure scraper/.env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); run `CRON_ENABLED=false node --import tsx src/worker.ts`; worker exits 0; scrape_runs success row; listings table gains subito rows
result: pending

### 3. Soft-block alert delivery
expected: Force validation failure (lower SCRAPE_MIN_COUNT_RATIO or empty feed); email or Telegram received with UI-SPEC copy; listings count unchanged for failed run
result: pending

### 4. Production 90-minute cron cadence
expected: Deploy Docker with CRON_ENABLED=true; repeated scrape_runs success rows within 1–2 hours; listing store refreshes on cadence
result: pending

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
