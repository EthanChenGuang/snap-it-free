---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 4
current_phase_name: Auth, Alerts & Push Notifications
status: executed
stopped_at: Completed 04-07-PLAN.md — Phase 4 code complete, pending verify/UAT
last_updated: "2026-08-01T16:00:00.000Z"
last_activity: 2026-08-04
last_activity_desc: Completed quick task 260804-f03: strict Stitch UI compliance for item detail page
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 20
  completed_plans: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-24)

**Core value:** Users can find and claim real free items near them in Venice faster than by manually checking Subito/FB Marketplace/community groups themselves.
**Current focus:** Phase 04 — verify work + operator setup (migration 016, VAPID, OAuth providers)

## Current Position

Phase: 4 — Auth, Alerts & Push Notifications
Plan: 7/7 executed
Status: Code complete — pending `/gsd-verify-work 4` and iPhone NOTF-04 QA
Last activity: 2026-08-04 - Completed quick task 260804-f03: strict Stitch UI compliance for item detail page

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
| Phase 04-auth-alerts-push-notifications P02 | 5 min | 3 tasks | 4 files |
| Phase 04-auth-alerts-push-notifications P04 | 8 min | 2 tasks | 11 files |
| Phase 04-auth-alerts-push-notifications P03 | 8 min | 2 tasks | 9 files |
| Phase 04 P05 | 18 min | 3 tasks | 11 files |
| Phase 04 P06 | 8m | 3 tasks | 17 files |
| Phase 04-auth-alerts-push-notifications P07 | 12m | 2 tasks | 9 files |

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
- [Phase ?]: Apple OAuth gated by NEXT_PUBLIC_APPLE_OAUTH_ENABLED until Supabase Apple provider configured
- [Phase ?]: modalTitle prop for action-specific auth gates (D-93)
- [Phase ?]: Alert CRUD via Route Handlers with max 5 enabled alerts and Settings Stitch UI (D-101, D-102, D-116)
- [Phase ?]: Logged-out favorite tap opens AuthPromptModal; Supabase writes only when authed (D-97)
- [Phase ?]: localStorage merge clears only after /api/favorites/merge 2xx (D-96)
- [Phase ?]: Auto-selected option-a: locked outbox + Vercel Cron poller (D-106)
- [Phase ?]: Delete-then-insert push_subscriptions due to RLS no UPDATE policy
- [Phase ?]: Dedupe push fan-out to one notification per user per listing match
- [Phase ?]: iOS guide auto-shows once per session on /settings; dismiss persists in localStorage

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260803-ci1 | add a ngrok link so that I can access the page on mobile phone | 2026-08-03 | — | [260803-ci1-add-a-ngrok-link-so-that-i-can-access-th](./quick/260803-ci1-add-a-ngrok-link-so-that-i-can-access-th/) |
| 260803-ci2 | map never loads on mobile — investigation & comparison | 2026-08-03 | — | [260803-ci2-map-never-loads-mobile-investigation](./quick/260803-ci2-map-never-loads-mobile-investigation/) |
| 260803-us0 | map zoom throws center TypeError | 2026-08-03 | — | [260803-us0-map-zoom-throws-center-typeerror](./quick/260803-us0-map-zoom-throws-center-typeerror/) |
| 260803-us1 | Elenco list scroll region too small; Pubblica did not scroll | 2026-08-03 | c7023f6, 2524d90 | [260803-us1-list-post-scroll-regions](./quick/260803-us1-list-post-scroll-regions/) |
| 260803-whr | fix Subito geo/zone pipeline so scraped free items surface in Elenco | 2026-08-03 | 8c6f24e, ca573b6, 9956629 | [260803-whr-fix-subito-geo-zone-pipeline-so-scraped-](./quick/260803-whr-fix-subito-geo-zone-pipeline-so-scraped-/) |
| 260803-wi0 | Research Italian and European free-item source candidates beyond Subito | 2026-08-03 | 893d917 | [260803-wi0-free-item-source-candidates](./quick/260803-wi0-free-item-source-candidates/) |
| 260804-dn7 | Strict Stitch UI compliance: header search, floating chips, cards, bottom nav | 2026-08-04 | 97e2911, e4004b9, b117d7e | [260804-dn7-strict-ui-compliance-refactor-based-on-p](./quick/260804-dn7-strict-ui-compliance-refactor-based-on-p/) |
| 260804-e2m | Strict Stitch UI compliance for Elenco list page | 2026-08-04 | dd5ba20 | [260804-e2m-strict-ui-compliance-refactor-for-elenco](./quick/260804-e2m-strict-ui-compliance-refactor-for-elenco/) |
| 260804-f03 | Strict Stitch UI compliance for item detail page | 2026-08-04 | d3c60e5 | [260804-f03-strict-ui-compliance-refactor-for-item-d](./quick/260804-f03-strict-ui-compliance-refactor-for-item-d/) |
| 260804-f75 | Strict Stitch UI compliance for Pubblica (Post Free Item) page | 2026-08-04 | 2594ce2 | [260804-f75-strict-ui-compliance-refactor-for-pubbli](./quick/260804-f75-strict-ui-compliance-refactor-for-pubbli/) |
| 260804-g12 | Strict Stitch UI compliance for Settings page | 2026-08-04 | bca8a16 | [260804-g12-strict-ui-compliance-refactor-for-settings](./quick/260804-g12-strict-ui-compliance-refactor-for-settings/) |
| 260804-h34 | Settings GENERALE profile banner refactor | 2026-08-04 | 5ccff49 | [260804-h34-refactor-generale-profile-banner-and-setti](./quick/260804-h34-refactor-generale-profile-banner-and-setti/) |

### Blockers/Concerns

- Phase 1: Subito legal/production posture — `robots.txt` machine rules allow `/` but disallow `?o=` pagination; a prose `#` comment forbids automated access; commercial bot management 403s non-browser clients. Needs Italian IP/privacy counsel before production crawl, plus a supply hedge (UGC + partnerships). See quick task [260803-wi0](./quick/260803-wi0-free-item-source-candidates/260803-wi0-RESEARCH.md): no high-volume non-scraping Italian free feed exists; best next supply move is national Subito seeds after lifting Venice geo hardcoding.
- Phase 1: Subito national free category structure verified live (~39.5k `regalo` results) — remaining risk is anti-bot durability and sui generis / GDPR exposure, not category existence
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

Last session: 2026-08-01T14:42:35.421Z
Stopped at: Completed 04-07-PLAN.md
Resume file: None
