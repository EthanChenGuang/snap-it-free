# Phase 2: Map + List Core Browsing - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning
**Mode:** Auto-selected (--auto)

<domain>
## Phase Boundary

Phase 2 delivers the login-optional, map-first browsing experience for live scraped Subito listings: real geospatial pins on a Venice map, a synchronized draggable bottom-sheet list, zone filtering, scraped-listing WebView shell with favorite/share/back controls, deep-link out to Subito to claim, and 48-hour listing expiry enforcement in queries. No UGC posting, no in-app DM, no auth gates, no push alerts, no full i18n — only the consumer-facing discovery shell that reads from the Phase 1 `listings` table.

Requirements in scope: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, SCRP-04.

</domain>

<decisions>
## Implementation Decisions

### Frontend Stack & Migration
- **D-01:** Evolve the **existing Vite/React SPA** (`src/`) for Phase 2 rather than migrating to Next.js now — wire live Supabase reads into the Stitch-derived components already in `src/components/` — **Reversibility:** costly — a later Next.js migration will touch routing, data fetching, and PWA setup, but deferring avoids blocking Phase 2 on a full framework replatform while auth/API routes (Phase 3–4) are still absent.
- **D-02:** Add **React Router** (or equivalent URL-based routing) to replace tab-only `NavTab` state — routes at minimum: `/` (map home), `/listing/:id` (detail/WebView shell) — **Reversibility:** reversible.
- **D-03:** Remove unused AI Studio scaffolding from the runtime path (`@google/genai`, `express`, mock chat/claim/post flows hidden or stubbed until Phase 3) — **Reversibility:** reversible.

### Map & Geospatial UX
- **D-04:** Integrate **MapLibre GL JS** with **react-map-gl** for real pin rendering from `lat`/`lng` — **Reversibility:** costly — map provider swap later requires marker/cluster rework.
- **D-05:** Use **OpenFreeMap** (or MapTiler free tier as fallback) for vector tiles — zero per-load billing per research stack — **Reversibility:** reversible.
- **D-06:** Default map viewport: **Venice metropolitan bounding box** centered on Centro Storico; no global mock cities — **Reversibility:** reversible.
- **D-07:** Enable **pin clustering** when zoomed out (MapLibre cluster layer) for performance with 100+ active listings — **Reversibility:** reversible.
- **D-08:** Listings with **null `lat`/`lng` or null `zone`** (per Phase 1 D-15/D-16) are **excluded from map pins and zone-filtered views** but may appear in an unfiltered "All zones" list with an "approximate location" badge if coords exist without zone — **Reversibility:** reversible.

### Home Layout & Navigation
- **D-09:** **Map-first default** — app opens on map view with bottom sheet peek visible (matches DISC-01 and Stitch `map_explorer_notion_style`) — **Reversibility:** reversible.
- **D-10:** Bottom sheet has **three snap points**: collapsed peek (~20% height, shows 1–2 cards), half (~50%), full (~90%) — drag handle matches Stitch prototype — **Reversibility:** reversible.
- **D-11:** Map and list show the **same filtered dataset** — selecting a list card pans/highlights the corresponding pin; tapping a pin scrolls the sheet to that card — **Reversibility:** reversible.

### Zone Filtering
- **D-12:** Zone filter uses the **canonical DB `zone` enum** (`centro_storico`, `mestre_marghera`, `lido_murano`) with display labels **Centro Storico / Mestre-Marghera / Lido-Murano** plus an **All** option — **Reversibility:** one-way — UI must align with ingestion enum; label drift breaks filter queries.
- **D-13:** Zone chips are **shared controls** affecting both map pins and bottom-sheet list simultaneously (single filter state) — **Reversibility:** reversible.
- **D-14:** Remove demo zone names (`Jing'an`, substring location matching) from `MapView.tsx` — **Reversibility:** reversible.

### Scraped Listing Detail & WebView Shell
- **D-15:** Scraped listings (`source = 'subito'`) open in an **in-app WebView shell** (iframe or equivalent) loading `external_url`, with a fixed top bar: **Back to list**, **Favorite**, **Share** — **Reversibility:** costly — shell UX is the core scraped-listing pattern for all later sources.
- **D-16:** Primary CTA on scraped detail: **"View on Subito" / "Claim on Subito"** opens `external_url` in a **new browser tab** (deep-link out) — no in-app contact — **Reversibility:** one-way — matches product decision in PROJECT.md Key Decisions.
- **D-17:** Show **source badge** (`Subito`) on list cards and detail header — only `subito` source exists in Phase 2 — **Reversibility:** reversible.
- **D-18:** WebView top bar **Share** copies a **deep link to `/listing/:id`** (app route), not the raw Subito URL — **Reversibility:** reversible.

### Favorites (Login-Optional for Phase 2)
- **D-19:** Favorites in Phase 2 are **anonymous localStorage-backed** (`shoumanwu_favorites: string[]` of listing UUIDs) — no auth gate — **Reversibility:** costly — Phase 4 must migrate local favorites to account-backed storage.
- **D-20:** Favorite toggle is available from **list cards, map sheet cards, and WebView top bar** — heart icon, filled when favorited — **Reversibility:** reversible.
- **D-21:** Add a **Favorites filter/view** accessible from map sheet or header (shows only favorited IDs still active in DB) — **Reversibility:** reversible.

### Data Layer & Expiry (SCRP-04)
- **D-22:** Fetch active listings via **Supabase JS client** (anon key) with query: `status = 'active' AND expires_at > now()` — **Reversibility:** costly — RLS policies and client choice anchor downstream reads.
- **D-23:** Replace mock `Item` type with **canonical listing shape** aligned to DB schema (`source`, `zone`, `external_url`, `photo_url`, `posted_at`, `expires_at`, etc.) — retire `Owner`, `condition`, `cost`, demo categories — **Reversibility:** costly — touches all view components.
- **D-24:** **48h expiry enforcement:** query-time filter (D-22) is the user-facing guarantee; add a **pg_cron job or lightweight scheduled task** to batch-update `status = 'expired'` where `expires_at < now()` for DB hygiene — **Reversibility:** reversible.
- **D-25:** Client **refetches listings on app focus and every 10 minutes** while open; show **"Updated X min ago"** in map header based on latest fetch timestamp — **Reversibility:** reversible.

### Search & Empty States
- **D-26:** Search is **client-side title substring** filter on the already-fetched active listings — no Postgres full-text search in Phase 2 — **Reversibility:** reversible.
- **D-27:** Empty state when zero listings match filter: **"No free items in [zone] right now — check back soon"** with option to clear filters — **Reversibility:** reversible.
- **D-28:** Empty state when DB returns zero active listings globally: **"Nothing free in Venice right now"** with last-updated timestamp — **Reversibility:** reversible.

### Design System
- **D-29:** All new/changed UI MUST follow **Google Stitch Structured Minimalist** per `.planning/google-stitch-ui-design/DESIGN.md` and Phase 1 `01-UI-SPEC.md` forward reference — use `@theme` tokens in `src/index.css`, not ad-hoc hex — **Reversibility:** reversible.
- **D-30:** Preserve Stitch screen mapping: `MapView.tsx` ← `map_explorer_notion_style`, `ListView.tsx` ← `listing_feed_notion_style`, detail shell ← `item_details_notion_style` layout patterns — **Reversibility:** reversible.

### Claude's Discretion
- Exact MapLibre cluster radius and zoom thresholds
- iframe vs sandboxed WebView component implementation details
- Supabase RLS policy wording for anon read of active listings
- pg_cron vs app-side expiry batch job scheduling
- Whether to keep ListView as a separate tab or fold into bottom sheet only (map-first may deprecate standalone list tab)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — product vision, map-first UX, login-optional browsing, scraped deep-link pattern, budget constraints
- `.planning/REQUIREMENTS.md` — DISC-01 through DISC-07, SCRP-04 definitions and traceability
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, dependency on Phase 1

### Phase 1 Context & Schema
- `.planning/phases/01-scraper-foundation-listing-data-model/01-CONTEXT.md` — locked scraper/store decisions (D-06–D-16), zone enum, listings table shape
- `.planning/phases/01-scraper-foundation-listing-data-model/01-UI-SPEC.md` — Stitch design contract for Phase 2+ frontend (spacing, typography, color, component rules)
- `supabase/migrations/002_listings_schema.sql` — canonical `listings` table, enums, indexes

### Research & Architecture
- `.planning/research/STACK.md` — MapLibre, Supabase client, Serwist/Next.js forward path (Phase 2 adopts MapLibre + Supabase from this doc)
- `.planning/research/ARCHITECTURE.md` — map+list UI patterns, WebView shell, zone-at-ingestion, single listings table

### Design Reference
- `.planning/google-stitch-ui-design/DESIGN.md` — Structured Minimalist tokens (colors, typography, spacing)
- `.planning/google-stitch-ui-design/map_explorer_notion_style/code.html` — map + bottom sheet reference
- `.planning/google-stitch-ui-design/listing_feed_notion_style/code.html` — list card grid reference
- `.planning/google-stitch-ui-design/item_details_notion_style/code.html` — detail layout reference

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — current Vite SPA structure, Stitch→React mapping, anti-patterns to fix
- `.planning/codebase/CONCERNS.md` — mock data, decorative map, type divergence — Phase 2 must address these
- `.planning/codebase/STACK.md` — current React/Vite/Tailwind stack

### State & Blockers
- `.planning/STATE.md` — Phase 1 complete; Supabase env may need operator configuration

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/MapView.tsx` — bottom sheet structure, zone chips, search bar (replace decorative map with MapLibre)
- `src/components/ListView.tsx` — bento card grid, category pills (adapt to listing cards with source badge)
- `src/components/ItemDetailView.tsx` — two-column detail layout (adapt for WebView shell wrapper)
- `src/components/Header.tsx`, `src/components/BottomNav.tsx` — app chrome shell
- `src/index.css` — Tailwind v4 `@theme` tokens (align to DESIGN.md)
- `scraper/` package — live data source already writing to Supabase `listings`

### Established Patterns
- Tab-state routing in `App.tsx` — **replace** with URL routing (anti-pattern per ARCHITECTURE.md)
- Props-down handlers from App container — keep until hooks extracted (`useListings`, `useFavorites`)
- Stitch Notion-adjacent aesthetic with Material Symbols icons — preserve
- Phase 1: single `listings` table, `zone` enum, `source` discriminator — frontend types must converge

### Integration Points
- Browser SPA → Supabase Postgres (anon SELECT on active listings via RLS)
- Map pins ← `listings.lat`, `listings.lng`, `listings.zone`
- WebView shell ← `listings.external_url`
- Expiry ← `listings.expires_at` (query filter + optional cron status flip)
- Favorites ← localStorage UUID list cross-referenced with fetched listings

</code_context>

<specifics>
## Specific Ideas

- Model after Snag's map-first feed but **stay free** — no paywall on browsing.
- Venice geography: zone polygons already tagged at ingestion; UI filter must use those tags, not radius or substring location matching.
- Scraped listings: user claims on Subito via deep-link — app is discovery layer only for scraped content.
- Preserve the AI Studio/Stitch visual language already implemented — don't introduce shadcn default theme.
- Phase 2 success requires real pins from Phase 1 scraper — empty DB is a valid but must-show-clear-empty-state UX.

</specifics>

<deferred>
## Deferred Ideas

### Out of Phase (noted, not acted on)
- UGC post flow, Street Dump, in-app DM, reserve/mark-sent — Phase 3
- Auth gates, account-backed favorites, push alerts — Phase 4 (localStorage favorites are Phase 2 bridge)
- Full trilingual UI (Italian/English/Chinese) — Phase 5; Phase 2 ships English UI strings with Italian app title
- Community report button, auto-hide after 2 reports — Phase 3 (MOD-01/02)
- Next.js + Serwist PWA migration — deferred until auth/API routes needed (Phase 3–4)
- FB Marketplace scraped listings — v2 (SCRP-07)
- Native mobile app — v2 (PLAT-01)
- Full-text search, saved searches — future phase
- Dark mode / appearance toggle — hide until implemented (currently non-functional in SettingsView)

</deferred>

---

*Phase: 02-Map + List Core Browsing*
*Context gathered: 2026-07-28 (auto mode)*
