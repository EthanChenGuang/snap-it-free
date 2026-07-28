# Phase 2: Map + List Core Browsing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-28
**Phase:** 2-Map + List Core Browsing
**Mode:** --auto (all areas auto-selected, no user prompts)
**Areas discussed:** Frontend stack, Map & geospatial UX, Home layout, Zone filtering, Scraped detail/WebView, Favorites, Data layer & expiry, Search & empty states, Design system

---

## Frontend Stack & Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate to Next.js App Router now | Full research-stack alignment, SSR/API routes, Serwist PWA | |
| Evolve existing Vite/React SPA | Wire Supabase into Stitch components; defer Next.js to Phase 3–4 | ✓ |
| Greenfield rewrite | Discard prototype, start fresh | |

**Auto-selected:** Evolve existing Vite/React SPA (D-01) — fastest path to live map with real data; Next.js deferred until auth/API needs emerge.
**Notes:** Add React Router for shareable listing URLs.

---

## Map & Geospatial UX

| Option | Description | Selected |
|--------|-------------|----------|
| MapLibre GL JS + OpenFreeMap/MapTiler | Free vector tiles, real lat/lng pins, clustering | ✓ |
| Keep decorative SVG/image map | Faster but fails DISC-01 | |
| Google Maps SDK | Per-load billing risk on lean budget | |

**Auto-selected:** MapLibre + react-map-gl (D-04, D-05), Venice bbox default (D-06), clustering enabled (D-07).

---

## Home Layout & Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Map-first with draggable bottom sheet | Matches PROJECT.md, DISC-01, Stitch prototype | ✓ |
| List-first with map as secondary tab | Faster to wire but wrong product posture | |
| Split-screen map + list always visible | Desktop-friendly but poor mobile UX | |

**Auto-selected:** Map-first default (D-09), three snap points (D-10), synchronized map/list selection (D-11).

---

## Zone Filtering

| Option | Description | Selected |
|--------|-------------|----------|
| DB `zone` enum chips (3 Venice zones + All) | Aligns with Phase 1 ingestion, DISC-03 | ✓ |
| Substring match on location text | Current prototype behavior; incorrect | |
| Radius / "near me" filter | Wrong for Venice bridge geography | |

**Auto-selected:** Canonical zone enum filter (D-12–D-14).

---

## Scraped Listing Detail & WebView Shell

| Option | Description | Selected |
|--------|-------------|----------|
| In-app WebView shell + deep-link CTA to Subito | DISC-04/05, Snag pattern | ✓ |
| Native detail page only (no iframe) | Loses in-app source preview | |
| Open Subito directly in new tab (no shell) | Fails DISC-04 favorite/share/back controls | |

**Auto-selected:** WebView shell with top bar (D-15), "Claim on Subito" deep-link (D-16), source badge (D-17).

---

## Favorites (Login-Optional)

| Option | Description | Selected |
|--------|-------------|----------|
| Anonymous localStorage favorites | Phase 2 success criteria: browse + favorite without account | ✓ |
| Auth-gated favorites (AUTH-02) | Correct for Phase 4; blocks Phase 2 criterion #4 | |
| No favorites in Phase 2 | Fails DISC-06 | |

**Auto-selected:** localStorage favorites (D-19–D-21); account migration deferred to Phase 4.

---

## Data Layer & 48h Expiry

| Option | Description | Selected |
|--------|-------------|----------|
| Query-time expiry filter + batch status cron | User never sees expired; DB stays clean | ✓ |
| Query-time only (no cron) | Simpler but stale `status` rows accumulate | |
| Hard-delete expired rows | Loses audit trail | |

**Auto-selected:** Supabase anon read with `expires_at > now()` (D-22), canonical listing types (D-23), dual expiry enforcement (D-24), 10-min refetch (D-25).

---

## Search & Empty States

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side title search + zone-specific empty states | Sufficient for Phase 2 listing volume | ✓ |
| Postgres full-text search | Over-engineered for hourly-scraped Venice feed | |
| No search in Phase 2 | Prototype already has search; users expect it | |

**Auto-selected:** Client-side title filter (D-26), contextual empty states (D-27, D-28).

---

## Design System

| Option | Description | Selected |
|--------|-------------|----------|
| Google Stitch Structured Minimalist (existing tokens) | Locked in 01-UI-SPEC.md | ✓ |
| shadcn default theme | Blocked by UI-SPEC anti-patterns | |
| Ad-hoc hex values in components | Current drift; fix in Phase 2 | |

**Auto-selected:** Stitch design authority (D-29, D-30).

---

## Claude's Discretion

- MapLibre cluster tuning parameters
- iframe/WebView implementation details
- Supabase RLS policy exact wording
- pg_cron vs app-side expiry batch
- Standalone list tab vs bottom-sheet-only navigation

## Deferred Ideas

- UGC posting, DM, moderation UI — Phase 3
- Auth, account favorites, push alerts — Phase 4
- Full i18n — Phase 5
- Next.js + Serwist PWA — Phase 3–4 when auth/API needed
- FB Marketplace scraper — v2
- Community report/auto-hide — Phase 3
- Full-text search, dark mode — future
