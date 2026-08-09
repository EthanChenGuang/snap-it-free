# 手慢无 (ShouManWu) — Venice Free Finds

## What This Is

A map-first PWA for discovering free items in Venice and Padova (Veneto). Scrapes Subito.it *regalo* listings via a DB-configurable URL matrix, displays them on an interactive map with zone and category filters, and supplements thin scraped supply with user-generated posts ("street dump"). Users browse without an account; login is required only for favorites, alerts, posting, and UGC contact. Trilingual UI (Chinese default, English, Italian) targets international students, residents, and expats. Operator manages scrape sources, schedules, and translation from a Stitch-aligned `/admin` console.

## Core Value

Users can find and claim real free items near them in Venice faster than by manually checking Subito/FB Marketplace/community groups themselves — validated by supply flow-through rate and user activity (MAU/retention), not revenue.

## Current State (v1.0 — shipped 2026-08-09)

**Stack:** Next.js App Router PWA, Supabase (PostGIS), MapLibre, Crawlee/Playwright scraper worker, Serwist SW, Vercel-ready (not yet deployed).

**Shipped capabilities:**
- Subito scraper with zone tagging, free-filter, soft-block alerts, admin-configurable sources and 34-URL Regalo matrix (Venice + Padova)
- Map-first browse, bottom sheet, zone/category filters, scraped detail + Subito deep-link, 48h expiry
- UGC Quick Post + Street Dump, in-app DM, community reports, auto-hide moderation
- Auth-gated favorites (Supabase-backed), keyword+zone alerts, push notifications + badge fallback, iOS A2HS onboarding
- Trilingual UI with locale-aware push fan-out
- Operator `/admin` console (sources, scheduler, run history, translation queue, allowlist)

**Not yet shipped:** Production deploy (Phase 7 → v2.0), FB Marketplace scraper, native mobile app.

## Next Milestone Goals (v2.0)

- Deploy Next.js PWA to Vercel with production OAuth and Serwist SW
- Deploy scraper worker to Fly.io with Supabase DB config
- External cron for alert matcher (cron-job.org)
- D-19 smoke checklist + rollback runbook
- Physical iPhone push QA (UAT test 12 from v1.0)

## Business Context

- **Customer**: No paying customer in v1 — free product for students/residents/expats
- **Revenue model**: None in v1; future subscription (instant alerts) and local ad partnerships considered post-validation
- **Success metric**: MAU, retention, and supply flow-through rate in the Venice market

## Requirements

### Validated (v1.0)

- ✓ Map-first home with zone filters and bottom sheet — v1.0 Phases 1–2
- ✓ Subito.it scraper with admin-configurable URL matrix — v1.0 Phases 1, 6, 8
- ✓ 48-hour auto-expiry of scraped listings — v1.0 Phase 2
- ✓ Community report + auto-hide moderation — v1.0 Phase 3
- ✓ In-app WebView for scraped listings with Subito deep-link — v1.0 Phase 2
- ✓ UGC quick-post + Street Dump — v1.0 Phase 3
- ✓ In-app DM + reserve/mark-sent for UGC — v1.0 Phase 3
- ✓ Login-optional browsing with auth gates on favorite/alert/post/contact — v1.0 Phases 3–4
- ✓ Push notifications + keyword/zone alerts — v1.0 Phase 4
- ✓ Trilingual UI (zh/en/it) — v1.0 Phase 5

### Active (v2.0+)

- [ ] Production deploy: Vercel PWA + Fly.io worker + production OAuth (Phase 7)
- [ ] FB Marketplace scraper (SCRP-07, best-effort secondary source)
- [ ] Physical iPhone push QA sign-off (NOTF-04 operator follow-up from v1.0)
- [ ] Google OAuth production redirect configuration

### Out of Scope

- Paywalling the live feed — deliberate divergence from Snag's monetization model
- In-app contact/DM for scraped listings — deep-link to source instead
- Scraping closed/login-walled Chinese community channels — served via Chinese UI over scraped inventory
- Native mobile app at launch — PWA validates faster; deferred to PLAT-01
- Real-time push for hourly-scraped data — poll-based refresh sufficient
- Social graph, payment/checkout — out of utility scope

## Context

- **Codebase:** ~70k LOC added across 521 files (Jul–Aug 2026); 39 phase plans executed
- **Supply:** Padova ingest verified (39 visible rows); Venice + Padova 34-URL seed operational
- **Tech debt:** Phase 4 formal VERIFICATION.md absent (UAT 13/14 pass); FCFS DM race; Nyquist validation unreconciled
- **Legal:** Subito robots.txt / anti-bot posture needs Italian counsel before sustained production crawl

## Constraints

- **Budget**: $20-100/month for proxies, maps, hosting
- **Team**: Solo builder (+ AI assistance)
- **Tech/legal**: Subito anti-scraping defenses — scraper reliability is a real operational risk
- **Platform**: PWA first; native app deferred

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stay free in v1 instead of copying Snag's paywall | MVP validates MAU/retention, not revenue | ✓ Good — shipped free feed |
| Keep UGC posting despite Snag being pure-aggregation | Venice market supply too thin for scrape-only | ✓ Good — UGC + scrape coexist |
| Scraped listings deep-link out; UGC gets in-app DM | Matches Snag pattern for uncontrolled content | ✓ Good — implemented |
| Subito as primary scraper; FB Marketplace deferred | Clearer regalo category, fewer defenses | ✓ Good — Subito + admin matrix shipped |
| Ship as PWA before native mobile | Faster validation, no app store review | ✓ Good — PWA feature-complete |
| Phase 7 deploy deferred to v2.0 | Focus v1.0 on supply matrix + features | ✓ Good — v1.0 closed without deploy |
| DB-driven scrape config via `/admin` | Operator agility without redeploy | ✓ Good — admin console shipped |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-08-09 after v1.0 milestone*
