# 手慢无 (ShouManWu) — Venice Free Finds

## What This Is

A feed-first PWA (v2.0) for discovering free items in Venice and Padova (Veneto). Scrapes Subito.it *regalo* listings via a DB-configurable URL matrix, displays them in a mobile grid feed with search, radius/zone filters, and map as a secondary view, and supplements thin scraped supply with user-generated posts ("street dump"). Users browse without an account; login is required only for favorites, alerts, posting, and UGC contact. Trilingual UI (Chinese default, English, Italian) targets international students, residents, and expats. Operator manages scrape sources, schedules, and translation from a Stitch-aligned `/admin` console.

## Core Value

Users can find and claim real free items near them in Venice faster than by manually checking Subito/FB Marketplace/community groups themselves — validated by supply flow-through rate and user activity (MAU/retention), not revenue.

## Current Milestone: v2.0 — Snag-style Consumer UX + Production Deploy

**Started:** 2026-08-09  
**Status:** Planning

### Goals

1. **Feed-first IA** — Grid home replaces map-first `/`; map opened via location button (Snag interaction pattern, Stitch visuals)
2. **Search & filters** — Filter bottom sheet (km radius + categories), active filter pills, distance on cards; retain Venice zone + Padova city filters
3. **Navigation** — Bottom nav Home · Favorites · Settings; Post via drawer; no subscription tab
4. **Canonical category mapping** — Unified resolver across Subito, UGC, and future sources using 17 Subito regalo slugs
5. **Select Location** — Full-screen map picker for filter center and UGC post
6. **Settings parity** — DND, delete account, Stitch restyle; retain alerts/zone/appearance/iOS A2HS
7. **Production deploy** — Vercel PWA + Fly.io worker + OAuth + cron + D-19 smoke (Phase 7)

### Key Decisions (locked at milestone init)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Default home | Grid feed at `/` | User-specified; matches reference app browse pattern |
| Map role | Secondary via location button | Keeps map capability without map-first IA |
| Distance | Haversine + optional km radius | European units; composes with zone chips |
| Bottom nav | Home · Favorites · Settings | Reference app IA; Post not primary tab |
| Visual design | Google Stitch only | Reference screenshots = interaction, not visual clone |
| Monetization | Excluded | Stay free unless explicitly opted in later |

## Current State (v1.0 — shipped 2026-08-09)

**Stack:** Next.js App Router PWA, Supabase (PostGIS), MapLibre, Crawlee/Playwright scraper worker, Serwist SW, Vercel-ready (not yet deployed).

**Shipped capabilities:**
- Subito scraper with zone tagging, free-filter, soft-block alerts, admin-configurable sources and 34-URL Regalo matrix (Venice + Padova)
- Map-first browse, bottom sheet, zone/category filters, scraped detail + Subito deep-link, 48h expiry
- UGC Quick Post + Street Dump, in-app DM, community reports, auto-hide moderation
- Auth-gated favorites (Supabase-backed), keyword+zone alerts, push notifications + badge fallback, iOS A2HS onboarding
- Trilingual UI with locale-aware push fan-out
- Operator `/admin` console (sources, scheduler, run history, translation queue, allowlist)

## Requirements

See [.planning/REQUIREMENTS.md](.planning/REQUIREMENTS.md) for v2.0 checkable requirements (38 total).

### Validated (v1.0)

- ✓ Map-first home with zone filters and bottom sheet — v1.0 Phases 1–2
- ✓ Subito.it scraper with admin-configurable URL matrix — v1.0 Phases 1, 6, 8
- ✓ 48-hour auto-expiry of scraped listings — v1.0 Phase 2
- ✓ Community report + auto-hide moderation — v1.0 Phase 3
- ✓ UGC quick-post + Street Dump — v1.0 Phase 3
- ✓ Login-optional browsing with auth gates — v1.0 Phases 3–4
- ✓ Push notifications + keyword/zone alerts — v1.0 Phase 4
- ✓ Trilingual UI (zh/en/it) — v1.0 Phase 5

### Active (v2.0)

- [ ] Feed-first grid home + nav restructure (Phase 9)
- [ ] Filter sheet, distance, active pills (Phase 10)
- [ ] Grid cards: FREE badge, heart, metadata (Phase 11)
- [ ] Canonical category mapping across sources (Phase 12)
- [ ] Select Location flow (Phase 13)
- [ ] Settings: DND, delete account (Phase 14)
- [ ] Production deploy (Phase 7)

### Out of Scope (v2.0)

- Subscription / Restore Purchase
- Snag red theme / floating capsule nav verbatim
- FB Marketplace scraper (SCRP-07)
- Native app store packages (PLAT-01)

## Context

- **Codebase:** ~70k LOC; v1.0 tag `v1.0` at commit 4c13472
- **Design:** `.planning/google-stitch-ui-design/DESIGN.md`
- **Reference UI:** Snag-style screenshots (interaction benchmarks) in workspace assets
- **Tech debt:** Phase 4 formal VERIFICATION.md; FCFS DM race; Nyquist validation unreconciled

## Constraints

- **Budget**: $20-100/month for proxies, maps, hosting
- **Team**: Solo builder (+ AI assistance)
- **Backend**: Retain v1 Supabase listings, favorites API, alerts, push, UGC, admin
- **i18n**: All new strings in zh/en/it

## Key Decisions (historical)

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stay free instead of Snag paywall | MVP validates MAU/retention | ✓ v1 shipped free |
| Stitch over Snag visuals | Workspace design authority | → v2.0 locked |
| Feed-first over map-first | User milestone direction | → v2.0 Phase 9 |
| Phase 7 deploy after UX phases | Ship stable consumer UX before prod cutover | → v2.0 execution order |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-08-10 — Phase 12 scope pivot to canonical category mapping*
