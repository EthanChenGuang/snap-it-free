---
phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
plan: 05
subsystem: scraper-admin-sources
tags: [nextjs, supabase, url-validation, stitch, anti-block-presets]

requires:
  - phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
    plan: 03
    provides: AdminShell, operator middleware, lib/admin/queries tracer
provides:
  - /admin/sources list table with five sources (D-39)
  - /admin/sources/[slug] detail with interval, URLs, anti-block save (D-09, D-14, D-21)
  - validateTargetUrls host allowlist for SSRF mitigation (D-10)
  - Read-only validation thresholds panel (D-23)
affects:
  - 06-06 runs history UI
  - 06-07 settings proxy/allowlist

tech-stack:
  added: []
  patterns:
    - "getOperatorSession gate on all /api/admin/sources routes"
    - "SourcesListClient ports SourcesView without Add Source (D-54)"
    - "SourceDetailClient ports SubitoConfigView with zh copy per UI-SPEC"

key-files:
  created:
    - app/admin/sources/page.tsx
    - app/admin/sources/[slug]/page.tsx
    - components/admin/SourcesListClient.tsx
    - components/admin/SourceDetailClient.tsx
    - app/api/admin/sources/route.ts
    - app/api/admin/sources/[slug]/route.ts
    - lib/admin/validation-thresholds.ts
  modified:
    - lib/admin/url-validate.ts
    - lib/admin/url-validate.test.ts
    - components/admin/admin-messages.ts
    - scraper/src/config-loader.test.ts

key-decisions:
  - "Reused getOperatorSession from 06-04 instead of separate operator-route helper"
  - "Merged canEnableSource guard into PATCH handler for coming_soon sources"
  - "validation-thresholds.ts mirrors scraper/src/config.ts constants (scraper excluded from app tsconfig)"

requirements-completed:
  - SCRP-02
  - SCRP-07

coverage:
  - id: T1
    description: "Sources list table at /admin/sources with GET API; no Add Source button"
    requirement: SCRP-02
    verification:
      - kind: other
        ref: "test -f app/admin/sources/page.tsx && test -f app/api/admin/sources/route.ts"
        status: pass
    human_judgment: false
  - id: T2
    description: "Source detail saves interval, URLs, anti-block with URL validation and read-only thresholds"
    requirement: SCRP-02
    verification:
      - kind: unit
        ref: "lib/admin/url-validate.test.ts"
        status: pass
    human_judgment: false
  - id: T3
    description: "Anti-block preset flows from DB config through config-loader to crawler"
    requirement: SCRP-02
    verification:
      - kind: unit
        ref: "scraper/src/admin/presets.test.ts"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-08-04
status: complete
---

# Phase 6 Plan 05: Sources List/Detail Summary

**Operator-editable source list and detail screens with Venice URL validation, anti-block presets, and read-only worker thresholds — Subito live, four coming soon.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-04T18:42:00Z
- **Completed:** 2026-08-04T18:46:11Z
- **Tasks:** 3/3
- **Files modified:** 11

## Accomplishments

- `/admin/sources` renders five sources in a Stitch-styled table with status, enable toggle, interval, anti-block preset, last run, Edit, and Run now (D-39, D-53)
- Add Source button and handleAddSource flow excluded per D-54
- `/admin/sources/[slug]` detail page ports SubitoConfigView: interval stepper 30–1440, newline URLs, 保守/标准/激进 presets, save → PATCH (D-09, D-14, D-21)
- `validateTargetUrls` enforces per-slug HTTPS host allowlists before DB writes (D-10, T-06-10)
- Read-only validation thresholds panel shows selector rate, count ratio, geo resolution from worker constants (D-23)
- Crawler preset wiring verified: `loadSourceConfig` → `runSubitoCrawler` with `presetToCrawleeOptions` (D-21, D-22)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Consolidated operator session helper**
- **Found during:** Task 2
- **Issue:** Parallel 06-04 work added `getOperatorSession` in require-operator.ts; initial operator-route.ts was redundant
- **Fix:** Removed operator-route.ts; all sources routes use getOperatorSession
- **Files modified:** app/api/admin/sources/route.ts, app/api/admin/sources/[slug]/route.ts
- **Commit:** c5541d0

**2. [Rule 2 - Missing critical functionality] Merged coming_soon enable guard**
- **Found during:** Task 2
- **Issue:** Parallel 06-04 PATCH handler added canEnableSource; needed merge with full detail PATCH + URL validation
- **Fix:** Combined canEnableSource, validateTargetUrls, and full field updates in single PATCH handler
- **Commit:** c5541d0

## Self-Check: PASSED

- FOUND: app/admin/sources/page.tsx
- FOUND: app/admin/sources/[slug]/page.tsx
- FOUND: app/api/admin/sources/route.ts
- FOUND: app/api/admin/sources/[slug]/route.ts
- FOUND: lib/admin/url-validate.ts
- FOUND: lib/admin/validation-thresholds.ts
- FOUND: 4ffe480
- FOUND: c5541d0
- FOUND: ae18f20
