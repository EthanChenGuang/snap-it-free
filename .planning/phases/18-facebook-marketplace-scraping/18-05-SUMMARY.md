---
phase: 18-facebook-marketplace-scraping
plan: 05
subsystem: admin
tags: [facebook, admin, session_enc, url-matrix, SCRP-E05, D-18-10]
status: complete

requires:
  - phase: 18-facebook-marketplace-scraping
    plan: 03
    provides: probeFacebookSession worker gate
  - phase: 18-facebook-marketplace-scraping
    plan: 04
    provides: category mapping complete
provides:
  - RECOMMENDED_FACEBOOK_SEED_URLS 6-URL matrix module
  - FacebookUrlMatrix admin UI (city×query chips)
  - session_json PATCH encrypt → session_enc; sessionConfigured on GET
  - test-session API with operator gate + subprocess Playwright probe
  - Facebook source detail proxy configured indicator (SCRP-E05)
affects:
  - 18-06 (full matrix crawl)
  - 18-07 (human UAT session + proxy checks)

tech-stack:
  added: []
  patterns:
    - "Facebook admin URL validation: marketplace search path + required query param (D-18-24)"
    - "Session probe via scraper subprocess to reuse probeFacebookSession without bundling crawlee in Next"
    - "Monochrome Stitch chip styling on FacebookUrlMatrix (#f1f1f0 selected chips)"

key-files:
  created:
    - lib/admin/facebook-recommended-seed.ts
    - lib/admin/facebook-recommended-seed.test.ts
    - lib/admin/facebook-session.ts
    - components/admin/FacebookUrlMatrix.tsx
    - app/api/admin/sources/[slug]/test-session/route.ts
    - scraper/src/probe-facebook-session-cli.ts
  modified:
    - lib/admin/url-validate.ts
    - lib/admin/url-validate.test.ts
    - lib/admin/schemas.ts
    - lib/admin/queries.ts
    - lib/admin/types.ts
    - app/api/admin/sources/[slug]/route.ts
    - components/admin/SourceDetailClient.tsx
    - components/admin/admin-messages.ts

key-decisions:
  - "D-18-22 option-a: 6-URL Venice+Padova×gratis/regalo/free matrix (auto-selected)"
  - "Session probe runs in scraper subprocess via probe-facebook-session-cli.ts (Rule 2 — crawlee not in Next bundle)"

requirements-completed: [SCRP-E05, D-18-06, D-18-10, D-18-21, D-18-22, D-18-24, D-18-29, D-18-30, D-18-33, D-18-34]

metrics:
  duration: 18min
  completed: 2026-08-15
  tasks: 3
  files: 14
---

# Phase 18 Plan 05: Facebook Admin Parity Summary

**One-liner:** Operator Facebook source detail with encrypted session upload/test, 6-URL city×query matrix, hardened URL validation, and shared proxy posture indicator.

## Accomplishments

- Auto-selected **D-18-22 option-a**: 6-URL Venice+Padova × gratis/regalo/free recommended seed (not Venice-only).
- Added `RECOMMENDED_FACEBOOK_SEED_URLS`, `FacebookUrlMatrix`, and facebook branch in `SourceDetailClient`.
- PATCH accepts `session_json`, validates cookie shape, encrypts to `session_enc`; GET/`getSourceBySlug` expose `sessionConfigured` only.
- Added `POST /api/admin/sources/facebook/test-session` with operator gate and live probe via scraper subprocess.
- Extended `validateTargetUrl` for facebook marketplace search paths + required `query` param (D-18-24).
- Facebook sidebar shows shared `proxyConfigured` dot + warning link to `/admin/settings` (SCRP-E05).

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 2 | 888ff5b | Seed module, URL validation, session encrypt API |
| 3 | 010e42a | FacebookUrlMatrix, SourceDetailClient, test-session route |

## Decisions Made

- **D-18-22 option-a** — 6-URL city×query matrix (auto-selected at checkpoint)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Scraper subprocess for session probe**
- **Found during:** Task 3
- **Issue:** `probeFacebookSession` depends on crawlee/playwright in `scraper/`; Next.js app cannot bundle crawlee from root.
- **Fix:** Added `scraper/src/probe-facebook-session-cli.ts` and `lib/admin/facebook-session.ts` subprocess wrapper.
- **Files modified:** `scraper/src/probe-facebook-session-cli.ts`, `lib/admin/facebook-session.ts`
- **Commit:** 888ff5b, 010e42a

None otherwise — plan executed as written.

## Verification

- `npm run test:lib -- lib/admin/facebook-recommended-seed.test.ts lib/admin/url-validate.test.ts` — pass (435/435 lib suite)
- `npm run lint` — pass
- `npm run build` — pass; route `app/api/admin/sources/[slug]/test-session` registered
- Plan grep checks: FacebookUrlMatrix, test-session route, `isFacebook`, `proxyConfigured` — pass

## Self-Check: PASSED

- FOUND: lib/admin/facebook-recommended-seed.ts
- FOUND: components/admin/FacebookUrlMatrix.tsx
- FOUND: app/api/admin/sources/[slug]/test-session/route.ts
- FOUND: 888ff5b
- FOUND: 010e42a
