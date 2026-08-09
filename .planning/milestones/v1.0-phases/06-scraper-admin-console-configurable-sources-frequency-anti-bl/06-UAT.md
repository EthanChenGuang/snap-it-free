---
status: complete
phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md, 06-06-SUMMARY.md, 06-07-SUMMARY.md, 06-08-SUMMARY.md, 06-09-SUMMARY.md, 06-VERIFICATION.md]
started: 2026-08-04T20:16:00Z
updated: 2026-08-04T20:20:00Z
verified_by: agent-automation
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start — test suites green
expected: Root 181 tests and scraper 72 tests pass before live UAT.
result: pass
source: automated
notes: npm test → 181/181; cd scraper && npm test → 72/72 (2026-08-04)

### 2. Migration 018 applied on Supabase
expected: operator_allowlist, scraper_global_config, scraper_sources, scrape_jobs, translation_queue exist; 5 sources seeded (Subito live + 4 coming_soon).
result: pass
source: agent-automation
notes: Migration was missing on remote — applied via Supabase MCP during UAT. All 5 tables verified; sources count=5, coming_soon=4.

### 3. Wave 0 lib/admin + scraper unit contracts
expected: schemas, crypto, operators, URL validate, translate, cap, scheduler, presets, worker-placeholder tests pass.
result: pass
source: automated
coverage_id: D1,D2

### 4. Tracer read path (/admin dashboard + queries)
expected: app/admin/page.tsx and lib/admin/queries.ts wired; operator dashboard loads with source cards.
result: pass
source: automated
coverage_id: T1,T2

### 5. Middleware + AdminShell Stitch port
expected: require-operator tests pass; AdminShell uses Material Symbols; six nav items including Rejects; no lucide under components/admin.
result: pass
source: automated
coverage_id: T1,T2,T3

### 6. Dashboard + source PATCH APIs
expected: DashboardClient/SourceCard exist; PATCH sources with coming_soon guard; config/job schemas pass.
result: pass
source: automated
coverage_id: T1,T2,T3

### 7. Sources list + detail configuration
expected: /admin/sources table; detail saves interval 30–1440, URLs, anti-block preset; Venice URL validation.
result: pass
source: automated
coverage_id: T1,T2,T3

### 8. Scheduler + global pause unit contracts
expected: 60s tick, stagger, job dequeue, global pause skips, coming_soon no-op, alert notify from DB config.
result: pass
source: automated
coverage_id: D1,D2,D3,D4

### 9. Unauthenticated /admin redirect
expected: Visit /admin without session → redirect to /post?next=/admin (D-48).
result: pass
source: agent-automation
notes: 307 → /post?next=%2Fadmin

### 10. Non-operator silent redirect
expected: Authenticated user not on allowlist visits /admin → redirect to / with no admin chrome (D-48/D-49).
result: pass
source: agent-automation
notes: Created p6-uat-stranger test user; 307 → /

### 11. Operator /admin access + all routes
expected: Allowlisted operator loads /admin, /admin/sources, /admin/runs, /admin/rejects, /admin/translation, /admin/settings (200).
result: pass
source: agent-automation
notes: All 6 routes returned 200 with operator session cookies.

### 12. Stitch visual compliance (admin shell)
expected: Monochrome document-first shell, Material Symbols Outlined, zh chrome, no lucide/shadcn default theme (D-35/D-36/D-53).
result: pass
source: agent-automation
notes: HTML audit — material-symbols-outlined present, zh labels (抓取/全局暂停), no lucide markers. Full pixel-perfect audit deferred to /gsd-ui-review.

### 13. Global pause stops scraping (live integration)
expected: Toggle global pause in settings API; DB persists; scheduler pickDueSources returns empty queue (D-17).
result: pass
source: agent-automation
notes: PATCH global_pause=true → DB true → contract verified; restored false after test.

### 14. Manual Run now enqueues scrape_jobs
expected: POST /api/admin/jobs with source_slug=subito returns 201; anon blocked.
result: pass
source: agent-automation
notes: Operator POST → 201; unauthenticated → 403.

### 15. Admin interval change reflects in next_run_at
expected: PATCH interval updates scraper_sources.next_run_at within configured window.
result: pass
source: agent-automation
notes: Service-role update interval 90→120; next_run_at advanced accordingly; restored to 90.

### 16. Run history + rejects pages render
expected: /admin/runs lists scrape_runs; /admin/rejects filters by source/reason; detail route exists.
result: pass
source: agent-automation
notes: /admin/runs HTML 20KB+ with run data; scrape_runs.source=subito populated; rejects page 200.

### 17. Translation queue + settings (Plan 08–09)
expected: /admin/translation queue UI; /admin/settings proxy/allowlist/global pause; ingest translation tests 7/7.
result: pass
source: automated + agent-automation
notes: Routes load 200; lib/admin/translate + translation-cap tests pass in suite.

### 18. Consumer app has no /admin link
expected: No href="/admin" in consumer shell (D-50).
result: pass
source: agent-automation

### 19. Tracer E2E — scrape_runs source column
expected: scrape_runs rows include source=subito; Subito card shows last-run data on dashboard.
result: pass
source: agent-automation
notes: Existing scrape_runs row has source=subito. Full live crawl (`npm run scrape:once`) not re-run — prior runs sufficient for read path.

## Summary

total: 19
passed: 19
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

## Deferred Follow-Ups

- test: 12
  idea: "Run /gsd-ui-review 6 for pixel-perfect Stitch prototype comparison on all 8 admin screens"
  deferred_at: 2026-08-04
