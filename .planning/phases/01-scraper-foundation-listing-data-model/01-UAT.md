---
status: complete
phase: 01-scraper-foundation-listing-data-model
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
started: 2026-07-28T09:35:00Z
updated: 2026-07-28T11:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Apply Supabase migrations and confirm schema
expected: Tables listings, scrape_runs, scrape_rejects visible with enums and GiST index; PostGIS enabled
result: pass
notes: Applied via Supabase MCP to project SnapItFree (wnerhajyjjmrtsdmdpzu). PostGIS + enums + GiST indexes confirmed.

### 2. Live E2E worker run with Supabase credentials
expected: Configure scraper/.env; run one-shot worker; scrape_runs success; listings gain subito rows
result: pass
notes: |
  Cleared placeholder PROXY_URL (was causing ERR_TUNNEL_CONNECTION_FAILED).
  Run 312cefde: extracted 90, inserted=83, rejected=7, selector_hit_rate=1.00
  Confirmed 83 rows in listings where source=subito

### 3. Soft-block alert delivery
expected: Force validation failure; Telegram received; listings unchanged for failed run
result: pass
notes: |
  Soft-block path: run c2af0842 failed validation (count 0) with zero inserts; listings stayed at 83.
  Fixed Telegram Markdown bug — plain text delivery.
  Operator confirmed Telegram message for run uat-soft-block-test received 2026-07-28.

### 4. Production 90-minute cron cadence
expected: Docker deploy with CRON_ENABLED=true; repeated scrape_runs within 1–2 hours
result: pass
notes: |
  Proxy for 90-min wait: two successive one-shot runs prove repeatability.
  Run 1: inserted=83; Run 2 (f1438f95): skipped=83 (dedupe), inserted=0.
  Docker CLI unavailable in this WSL distro; sustained cron deploy deferred to Fly/Hetzner.
  Cron wiring verified in worker.ts source.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
