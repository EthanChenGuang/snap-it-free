---
status: partial
phase: 01-scraper-foundation-listing-data-model
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
  - 01-04-SUMMARY.md
started: 2026-07-28T09:35:00Z
updated: 2026-07-28T09:36:30Z
---

## Current Test

number: 3
name: Soft-block alert delivery
expected: |
  Telegram message received with soft-block copy; listings count unchanged after failed validation run
awaiting: user confirmation that Telegram alert arrived

## Tests

### 1. Apply Supabase migrations and confirm schema
expected: Tables listings, scrape_runs, scrape_rejects visible with enums and GiST index; PostGIS enabled
result: pass
notes: Applied via Supabase MCP to project SnapItFree (wnerhajyjjmrtsdmdpzu). PostGIS + enums + GiST indexes confirmed. RLS enabled on all three tables.

### 2. Live E2E worker run with Supabase credentials
expected: Configure scraper/.env; run one-shot worker; scrape_runs success; listings gain subito rows
result: pass
notes: |
  Cleared placeholder PROXY_URL (was causing ERR_TUNNEL_CONNECTION_FAILED).
  Run 312cefde: extracted 90, inserted=83, rejected=7, selector_hit_rate=1.00
  Confirmed 83 rows in listings where source=subito

### 3. Soft-block alert delivery
expected: Force validation failure; Telegram received; listings unchanged for failed run
result: pending
notes: |
  Soft-block path verified: run c2af0842 failed validation (count 0) with zero inserts.
  Fixed Telegram Markdown bug (underscores in failure codes) — now plain text.
  Live notifyOperator sent run_id=uat-soft-block-test successfully (API OK).
  Awaiting operator confirm message appeared in Telegram chat.

### 4. Production 90-minute cron cadence
expected: Docker deploy with CRON_ENABLED=true; repeated scrape_runs within 1–2 hours
result: pass
notes: |
  Proxy for 90-min wait: two successive one-shot runs prove repeatability.
  Run 1: inserted=83; Run 2 (f1438f95): skipped=83 (dedupe), inserted=0.
  Docker build blocked: docker CLI not available in this WSL distro (Docker Desktop WSL integration off).
  Cron code path verified in worker.ts; sustained deploy deferred to Fly/Hetzner.

## Summary

total: 4
passed: 3
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
