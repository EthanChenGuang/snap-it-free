---
status: complete
phase: 08-subito-regalo-url-matrix-venice-padova-veneto-all-categories
source:
  - 08-01-SUMMARY.md
  - 08-02-SUMMARY.md
  - 08-03-SUMMARY.md
  - 08-04-SUMMARY.md
  - 08-05-SUMMARY.md
  - 08-06-SUMMARY.md
  - 08-07-SUMMARY.md
  - 08-VERIFICATION.md
started: 2026-08-09T07:10:00Z
updated: 2026-08-09T07:15:00Z
verified_by: agent-automation
automation_script: scripts/phase8-uat-automation.mjs
automation_results: 08-uat-results.json
---

## Current Test

[testing complete]

## Tests

### 1. Padova spike gate script + artifact (D-15)
expected: Playwright spike script runs; 08-PADOVA-SPIKE.md documents PASS with ≥1 detail coord in Padova bbox
result: pass
source: automated
coverage_id: D1 (08-01)

### 2. Detail-URL category parser (D-18)
expected: extractCategoryFromSubitoUrl returns informatica slug from detail .htm URLs
result: pass
source: automated
coverage_id: D2 (08-01)

### 3. 34-URL catalog builder + dedupe (D-06)
expected: generateRegaloUrls produces 34 deduped Venice+Padova URLs across 17 slugs
result: pass
source: automated
coverage_id: D3 (08-01)

### 4. Padova inCityBbox geo gate (D-21)
expected: Padova sample coords pass inCityBbox when source_category_url is Padova
result: pass
source: automated
coverage_id: D4 (08-01)

### 5. Spike coord gate — live Subito detail coords (D-15 re-verify)
expected: Live spike PASS (2026-08-09); centroid fallback yields coords in Padova bbox; PADOVA_SPIKE_PASS=true
result: pass
source: agent-automation
notes: 08-PADOVA-SPIKE.md PASS 2/2 detail coords; subito-recommended-seed.ts PADOVA_SPIKE_PASS=true

### 6. Migration 020 city/region + D-28 listings_public
expected: city/region columns exist; listings_public exposes category; Padova rows with coords visible
result: pass
source: agent-automation
notes: check-padova-visible.mjs PASS; 39 Padova rows in listings_public

### 7. Scraper ingest city/region/category persist
expected: normalizeRawListing + persist write city, region, category; city-keyed Zod bbox; DB target_urls merge
result: pass
source: automated
coverage_id: D1-D4 (08-03)

### 8. Live Padova listing row in Supabase
expected: At least one Padova listing with city=padova, coords, visible in listings_public
result: pass
source: agent-automation
notes: visible_padova_in_listings_public=39 (check-padova-visible.mjs)

### 9. Admin RegaloUrlMatrix — Venice+Padova, 17 categories, Generate/Save
expected: Hybrid matrix above textarea; Venezia+Padova checkboxes; 17 Italian category checkboxes; Generate → 34 deduped URLs; template hint; ≥30 URL warning; future-region hint
result: pass
source: agent-automation
notes: Playwright on /admin/sources/subito; operator approved in 08-07

### 10. Padova + Venice URL validation (D-03)
expected: validateTargetUrl accepts Venezia and Padova Veneto regalo paths; rejects invalid hosts
result: pass
source: automated
notes: lib/admin/url-validate.test.ts

### 11. Recommended seed — 34 URLs when spike PASS (SC2)
expected: RECOMMENDED_SUBITO_SEED_URLS length 34; Venice + Padova × all regalo categories
result: pass
source: automated
coverage_id: SC2 (08-06)

### 12. Recommended seed confirm modal (D-14)
expected: Modal shows 34-URL copy; 保留当前 URL and Escape cancel without mutating textarea; Replace only on explicit confirm
result: pass
source: agent-automation
notes: Playwright modal interaction on /admin/sources/subito

### 13. filterByZone All includes Padova zone-null rows (D-22)
expected: filterByZone('All') returns zoned Venice listings plus zone-null rows with lat/lng
result: pass
source: automated
coverage_id: D1 (08-05)

### 14. matchesSubitoCategory prefers DB slug (D-29)
expected: Category filter uses listing.category slug over title inference
result: pass
source: automated
coverage_id: D2 (08-05)

### 15. Consumer 18 Subito category chips — Elenco (D-30)
expected: /list shows Tutte + 17 Italian slug chips; Tutte default; horizontal scroll row; chip click filters
result: pass
source: agent-automation
notes: 18 rounded-full chips; Informatica filter click verified

### 16. Consumer category chips — Map panel (D-30)
expected: Open map search → Categoria frosted panel with Tutte + 17 chips below zone row
result: pass
source: agent-automation
notes: Header Search toggle opens FloatingMapSearch category panel

### 17. Padova city labels on consumer cards (D-27)
expected: Elenco cards show Padova location label for zone-null Padova listings
result: pass
source: agent-automation

### 18. Padova listings visible in listings_public (SC3)
expected: check-padova-visible.mjs exits 0; useListingsPoll mount refresh loads live data
result: pass
source: automated
coverage_id: SC3 (08-06)

### 19. Worker reads expanded URL set from DB (D-18)
expected: config-loader merges DB target_urls over 3-URL fallback including Padova URLs
result: pass
source: automated
notes: scraper/src/config-loader.test.ts

### 20. Extension path for additional regions (SC6)
expected: URL builder accepts region param; static hint for annunci-{region}/regalo/…; free-text city/region columns
result: pass
source: automated
notes: RegaloUrlMatrix future-region hint visible in admin UI

## Summary

total: 20
passed: 20
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
