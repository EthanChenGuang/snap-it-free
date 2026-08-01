---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 4
current_phase_name: Auth, Alerts & Push Notifications
status: planning
stopped_at: Phase 4 context gathered
last_updated: "2026-08-01T14:16:35.631Z"
last_activity: 2026-08-01
last_activity_desc: Phase 03 complete, transitioned to Phase 4
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 13
  completed_plans: 13
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-24)

**Core value:** Users can find and claim real free items near them in Venice faster than by manually checking Subito/FB Marketplace/community groups themselves.
**Current focus:** Phase 03 — UGC Posting & Community Marketplace

## Current Position

Phase: 4 — Auth, Alerts & Push Notifications
Plan: Not started
Status: Ready to plan
Last activity: 2026-08-01 — Phase 03 complete, transitioned to Phase 4

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 13
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 4 | - | - |
| 02 | 5 | - | - |
| 03 | 4 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01-scraper-foundation-listing-data-model P01 | 45 | 3 tasks | 22 files |
| Phase 01-scraper-foundation-listing-data-model P02 | 12 | 3 tasks | 14 files |
| Phase 01-scraper-foundation-listing-data-model P03 | 8 | 3 tasks | 11 files |
| Phase 01-scraper-foundation-listing-data-model P04 | 12 | 3 tasks | 11 files |
| Phase 02-map-list-core-browsing P01 | 105 | 3 tasks | 22 files |
| Phase 02 P02 | 45 | 3 tasks | 19 files |
| Phase 02 P03 | 3min | 3 tasks | 13 files |
| Phase 02-map-list-core-browsing P04 | 5min | 3 tasks | 22 files |
| Phase 03-ugc-posting-community-marketplace P01 | 6 | 3 tasks | 37 files |
| Phase 03-ugc-posting-community-marketplace P02 | 5min | 3 tasks | 12 files |
| Phase 03-ugc-posting-community-marketplace P03 | 8min | 3 tasks | 17 files |
| Phase 03-ugc-posting-community-marketplace P04 | 12min | 3 tasks | 18 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Subito.it scraper (Phase 1) must precede map UI (Phase 2) — a map with no pins is a broken first-run experience; hard sequencing dependency, not a preference
- [Roadmap]: UGC posting (Phase 3) sequenced after core scraped browsing so the shared `listings` schema and zone taxonomy are proven against real data first
- [Roadmap]: Auth/alerts (Phase 4) sequenced after both supply sources exist so alert-matching has a stable, populated schema to test against
- [Roadmap]: i18n (Phase 5) placed last as additive/non-blocking, but can be pulled earlier if translation work happens in parallel
- [01-01 Task 1]: D-06/D-08/D-09 locked — Supabase Pro + PostGIS geography column, single listings table (option-a)
- [Phase ?]: D-06/D-08/D-09 locked — Supabase Pro + PostGIS geography column, single listings table (option-a)
- [Phase ?]: npm package legitimacy verified for crawlee, playwright, @supabase/supabase-js, zod, @turf/boolean-point-in-polygon, vitest
- [Phase ?]: Detail-page extraction for tracer — category cards lack reliable posted_at/photo
- [Phase ?]: Null lat/lng when map embed absent on sampled Subito listing (D-16)
- [Phase ?]: GeoJSON loaded via readFileSync for vitest compatibility
- [Phase ?]: Municipality centroid fallback in extract resolveCoords before normalize (D-16)
- [Phase ?]: scrape_run_id null until Plan 04 run tracking
- [Phase ?]: Package legitimacy verified via npm registry for resend and node-telegram-bot-api
- [Phase ?]: setInterval 90min cron instead of node-cron invalid */90 expression
- [Phase ?]: Telegram alerting preferred when TELEGRAM_BOT_TOKEN set
- [Phase ?]: Next build uses --webpack due to MapLibre/Turbopack incompatibility
- [Phase ?]: Stitch map explorer header and surface tokens ported to app/globals.css per DESIGN.md
- [Phase ?]: vaul modal=false with pointer-events auto workaround for map click-through
- [Phase ?]: Italian chrome centralized in messages/it.ts; listing titles remain scraped Italian
- [Phase ?]: Subito detail is metadata shell + external CTAs; iframe best-effort with timeout fallback
- [Phase ?]: isAllowedExternalUrl restricts external links to https subito.it hosts only
- [Phase ?]: Favorites key shoumanwu_favorites stable for Phase 4 migration
- [Phase ?]: useListingsPoll 300000ms shared by map and list routes
- [Phase ?]: npm run dev/build default to Next.js App Router
- [Phase ?]: Option-a locked: magic link + migration 007 + RLS (D-54, D-66, D-87)
- [Phase ?]: listing_reports uses reporter_user_id only — no fingerprint (03-REVIEWS)
- [Phase ?]: CreateListingSchema uses scraper Venice bounds 45.0-45.7 / 12.1-12.6
- [Phase ?]: FCFS via security-definer RPC listing_has_other_buyer_conversation (migration 008)
- [Phase ?]: Duplicate conversation POST returns existing id for DM reopen (03-REVIEWS)
- [Phase ?]: Option-a locked: authenticated reports with unique (listing_id, reporter_user_id) (D-82)
- [Phase ?]: Migration 009 for report auto-hide trigger — 008 reserved for FCFS messaging
- [Phase ?]: Auto-hide via AFTER INSERT trigger only — no GRANT EXECUTE RPCs (03-REVIEWS)
- [Phase ?]: Street Dump pin confirm separate from GPS seed — never auto-publish (Pitfall 8)
- [Phase ?]: Owner lifecycle uses OwnerListingRow.owner_user_id not listings_public (03-REVIEWS)
- [Phase ?]: Rate limits: 3 UGC posts/24h and 5 DM starts/hour via DB counts (D-85)

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: Subito.it's `robots.txt` explicitly forbids scraping (not a soft crawl-delay) — needs a documented ToS/legal review before pointing at production, and a non-scraping fallback supply plan
- Phase 1: Subito's live "free/regalo" category structure and current anti-bot posture were not directly verified during research — needs a spike before committing to selector/extraction design
- Phase 4: iOS PWA push behavior is fast-moving and regulatory-sensitive (EU DMA) — verify against WebKit's current official docs at implementation time, and test end-to-end on a real iPhone, not the Simulator
- SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not configured — worker persist blocked until operator sets env and applies migrations

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Scraped Supply | FB Marketplace scraper (SCRP-07), closed FB group scraping (SCRP-08) | v2 | Requirements definition |
| Monetization | Instant-alerts subscription (MON-01), local ad partnerships (MON-02) | v2 | Requirements definition |
| Platform | Native mobile app (PLAT-01) | v2 | Requirements definition |

## Session Continuity

Last session: 2026-08-01T14:16:35.620Z
Stopped at: Phase 4 context gathered
Resume file: /home/guang/Projects/Experiments/snap-it-free/.planning/phases/04-auth-alerts-push-notifications/04-CONTEXT.md
