---
status: testing
phase: 18-facebook-marketplace-scraping
source: [18-VERIFICATION.md]
started: 2026-08-15T18:56:00Z
updated: 2026-08-15T18:56:00Z
executor: autonomous
---

## Current Test

number: 1
name: Apply migration 030 + admin UI smoke test
expected: |
  Apply `030_facebook_session_enc.sql`; start dev server; open `/admin/sources/facebook`.
  Session upload field, Test session button, 6-URL matrix, proxy status, `enabled=false`.
awaiting: operator credentials + migration apply

## Tests

### 1. Apply migration + admin UI smoke test
expected: Apply migration 030; `/admin/sources/facebook` shows session upload, Test session, 6-URL matrix, proxy indicator, enabled=false
result: pending

### 2. Operator session upload + encrypt
expected: Paste valid session JSON → Test session → Save; session_configured=true; no raw cookies in GET
result: pending

### 3. Live manual crawl
expected: Configure PROXY_URL; enable facebook; manual worker run completes with persisted listings or session_expired fail-fast
result: pending

### 4. Mixed feed visual check
expected: FB listings chronologically mixed with Subito/Vinted; FREE badge + Facebook chip visible
result: pending

### 5. Category filter on live listing
expected: FilterSheet category slug includes mapped FB listing; unmapped excluded
result: pending

### 6. Padova first manual run (D-18-30)
expected: Padova seed URLs retain slug; listings get city=padova or valid bbox coords
result: pending

### 7. Wave 0 live re-run (production gate)
expected: `FB_SESSION_JSON=… PROXY_URL=… node scraper/scripts/spike-facebook-marketplace.mjs` → **Verdict: PASS**
result: pending
note: Currently **Verdict: FAIL** — scaffold approved for implementation; live PASS required before production enablement

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
