# Phase 2: Map + List Core Browsing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-28
**Phase:** 02-map-list-core-browsing
**Mode:** --auto (all areas auto-selected, recommended defaults)
**Areas discussed:** App Shell & Stack, Map-First Home, Map Provider, Zone Filter, Data Layer, 48h Expiry, WebView Shell, Favorites Pre-Auth, Login-Optional, UI Language, Component Library

---

## App Shell & Frontend Stack

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate to Next.js App Router | New `app/` tree, URL routing, Server Components, Vercel deploy path | ✓ |
| Evolve Vite SPA in place | Keep tab-state routing, add Supabase fetch to existing `src/App.tsx` | |
| Parallel Vite + Next.js | Maintain both during transition | |

**Auto choice:** Migrate to Next.js App Router (D-24, D-26) — aligns with `.planning/research/STACK.md` and fixes URL routing anti-pattern.
**Notes:** Preserve Stitch visuals from existing prototype (D-25).

---

## Map-First Home Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Map default with draggable bottom sheet (2 snap points) | ROADMAP success criterion #2; Stitch map_explorer pattern | ✓ |
| List default with map secondary tab | Faster to ship but violates map-first product goal | |
| Full-screen map only, list in separate tab | Loses simultaneous map+list browsing | |

**Auto choice:** Map default + bottom sheet with collapsed/expanded snaps (D-27, D-28, D-29).
**Notes:** BottomNav retained; List tab = full-screen feed (D-30).

---

## Map Provider & Tiles

| Option | Description | Selected |
|--------|-------------|----------|
| MapLibre GL JS + OpenFreeMap (free tiles) | Budget-safe, no per-load billing | ✓ |
| Mapbox GL JS | Better styling tools but variable cost risk | |
| Static/decorative map (keep prototype) | No real geo accuracy | |

**Auto choice:** MapLibre + react-map-gl + OpenFreeMap (D-31, D-32, D-33).

---

## Zone Filter UX

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal chips matching `venice_zone` enum | Syncs map + list; matches Phase 1 schema | ✓ |
| Dropdown filter | Less visible on mobile | |
| Map-drawn zone boundaries only | No explicit filter control | |

**Auto choice:** Chip row All + 3 zones (D-34, D-35); hide null-zone listings (D-36).

---

## Data Fetching

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase anon + RLS, Server Component initial fetch, 5-min poll | Simple, fits low listing volume at launch | ✓ |
| Next.js API routes as BFF | Extra layer without clear Phase 2 benefit | |
| Realtime Supabase subscription | Overkill for 1–2 hr scraper cadence | |

**Auto choice:** Anon RLS read + Server Component + poll refresh (D-37, D-38, D-39).

---

## 48-Hour Expiry (SCRP-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Query-time filter + pg_cron status flip | User never sees expired; DB stays clean | ✓ |
| Query-time filter only | Expired rows stay `active` in DB indefinitely | |
| Client-side expiry calculation | Trusts client clock; inconsistent | |

**Auto choice:** Query filter + daily pg_cron (D-40, D-41).

---

## Scraped Listing WebView Shell

| Option | Description | Selected |
|--------|-------------|----------|
| In-app iframe WebView + top bar (back/favorite/share/open Subito) | DISC-04/05; Snag-style deep-link pattern | ✓ |
| External browser only | Breaks in-app browsing flow | |
| Native detail page scraping Subito DOM | Fragile, duplicates source content | |

**Auto choice:** iframe shell with canonical metadata chrome (D-42–D-45).

---

## Favorites (Pre-Auth)

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage UUID list until Phase 4 auth | DISC-06 without AUTH-01/02 in scope | ✓ |
| Defer favorites entirely to Phase 4 | Misses Phase 2 success criterion | |
| Anonymous Supabase favorites table | Needs auth identity eventually anyway | |

**Auto choice:** localStorage favorites + `/favorites` route (D-46–D-48).

---

## Login-Optional Browsing

| Option | Description | Selected |
|--------|-------------|----------|
| No login wall; stub Post/Settings | DISC-07; auth in Phase 4 | ✓ |
| Soft login prompt on first visit | Violates login-optional requirement | |

**Auto choice:** Full anonymous browse (D-49, D-50).

---

## UI Language

| Option | Description | Selected |
|--------|-------------|----------|
| Italian chrome, centralized constants module | Primary audience; Phase 5 adds EN/ZH | ✓ |
| English-only for dev speed | Misaligns with Italian-primary product | |
| Full next-intl now | Phase 5 scope; premature | |

**Auto choice:** Italian app chrome (D-51, D-52).

---

## Component Library

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn/ui for sheet/dialog/toast + Stitch tokens | Research stack + Phase 1 UI-SPEC | ✓ |
| Inline Tailwind only (prototype pattern) | Bottom sheet harder to implement accessibly | |

**Auto choice:** shadcn with Stitch styling (D-53).

---

## Claude's Discretion

- OpenFreeMap vs MapTiler fallback
- iframe sandbox vs redirect if Subito blocks embed
- Pull-to-refresh mechanism
- Pin clustering threshold
- Server/client component split

## Deferred Ideas

All captured in CONTEXT.md `<deferred>` — UGC, auth, push, i18n, moderation, FB scraper, native app.
