# Phase 2: Map + List Core Browsing - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning
**Mode:** Auto-selected (--auto)

<domain>
## Phase Boundary

Phase 2 delivers the map-first, login-optional browsing experience that puts Phase 1 scraped listings in front of users: live map pins, a draggable bottom-sheet list, zone filtering, scraped-listing WebView shell with favorite/share/back/deep-link-out, anonymous favorites (local until Phase 4 auth), and 48-hour expiry enforcement on what users see.

Requirements in scope: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, SCRP-04.

Out of scope: UGC posting, in-app DM, auth/login flows, push alerts, full trilingual UI, FB Marketplace scraper, moderation/report UI, operator dashboard.

</domain>

<decisions>
## Implementation Decisions

### App Shell & Frontend Stack
- **D-24:** Migrate from the Vite tab-state SPA prototype to **Next.js App Router** (new `app/` tree) for Phase 2 — enables shareable listing URLs, Server Components for initial fetch, and the planned PWA path on Vercel — **Reversibility:** costly — undo means maintaining two frontends or a full revert of routing/data layers.
- **D-25:** **Port and preserve** the Google Stitch Structured Minimalist look from existing `src/components/*` and `.planning/google-stitch-ui-design/DESIGN.md` — do not redesign; extend the Notion-adjacent palette and layout density — **Reversibility:** reversible.
- **D-26:** Replace tab-state routing (`NavTab` in `src/App.tsx`) with **URL-based routes**: `/` = map home, `/listing/[id]` = detail/WebView shell — **Reversibility:** costly — deep links and share URLs depend on this shape.

### Map-First Home Layout
- **D-27:** **Map is the default home route** — opening the app lands on the map with pins, not the list grid — **Reversibility:** reversible.
- **D-28:** Use a **draggable bottom sheet** over the map with two snap points: collapsed (~25% viewport, peek at 2–3 listing cards) and expanded (~75% viewport); map stays visible and pannable in both — **Reversibility:** reversible.
- **D-29:** **Bidirectional map↔list sync**: tapping a pin highlights + scrolls the matching card; tapping a list card centers/focuses the pin and opens a compact popup — **Reversibility:** reversible.
- **D-30:** Retain **BottomNav** with Map / List / Post / Settings tabs; List tab shows the full-screen feed (`ListView` pattern) while Map tab is the primary map+sheet experience — **Reversibility:** reversible.

### Map Provider & Viewport
- **D-31:** **MapLibre GL JS + react-map-gl** for rendering; vector tiles from **OpenFreeMap** (free, no token) with MapTiler free tier as fallback if styling needs exceed OpenFreeMap — **Reversibility:** costly — map integration touches pins, sheet, and detail flows.
- **D-32:** Default viewport centered on **Venice** (~45.44°N, 12.33°E, zoom ~11) showing all three zones; include optional **"Locate me"** button (browser geolocation) that re-centers but does **not** filter listings by default — **Reversibility:** reversible.
- **D-33:** Plot pins from **`lat`/`lng`** on each listing row; listings with null coordinates are **excluded from map pins** but may appear in list with a "approximate zone" badge if `zone` is set — **Reversibility:** reversible.

### Zone Filter UX
- **D-34:** Zone filter as **horizontal chip row**: All / Centro Storico / Mestre-Marghera / Lido-Murano — maps 1:1 to Phase 1 `venice_zone` enum; remove prototype mock zones (e.g. Jing'an) — **Reversibility:** reversible.
- **D-35:** Zone filter applies **simultaneously** to map pins and bottom-sheet/list views; default **All** shows every active, non-expired listing with a non-null zone — **Reversibility:** reversible.
- **D-36:** Listings with **`zone = null`** (operator-review rows from Phase 1 D-15) are **hidden from all user-facing feeds** in Phase 2 — **Reversibility:** reversible.

### Data Fetching & Supabase Integration
- **D-37:** Read listings via **Supabase anon client** with RLS allowing public `SELECT` on rows where `status = 'active' AND expires_at > now()` — **Reversibility:** one-way — RLS policies are migration-sensitive.
- **D-38:** Initial load via **Next.js Server Component** fetch; client **poll refresh every 5 minutes** plus pull-to-refresh on list — no realtime subscription (scraper cadence is 1–2 hr) — **Reversibility:** reversible.
- **D-39:** Map bounding-box queries deferred — Phase 2 loads **all active Venice listings** (expected low volume at launch); optimize with bbox/zone-indexed queries only if perf regresses — **Reversibility:** reversible.

### 48-Hour Expiry Enforcement (SCRP-04)
- **D-40:** Enforce expiry at **query time** in every user-facing read: `expires_at > now() AND status = 'active'` — **Reversibility:** reversible.
- **D-41:** Add **pg_cron daily job** to set `status = 'expired'` where `expires_at < now()` for housekeeping and operator visibility — **Reversibility:** reversible.

### Scraped Listing Detail & WebView Shell
- **D-42:** Scraped listings (`source = 'subito'`) open in an **in-app WebView shell** route — embedded iframe (or equivalent) loading `external_url` — not a native detail page duplicating Subito content — **Reversibility:** costly.
- **D-43:** WebView **top bar controls**: Back to list/map, Favorite (heart), Share (Web Share API with clipboard fallback), **"Apri su Subito"** opens `external_url` in a new browser tab — **Reversibility:** reversible.
- **D-44:** Primary CTA on scraped detail is **"Claim on Subito"** (external deep-link) — **no in-app contact/DM** for scraped listings — **Reversibility:** one-way — core product boundary from Phase 1.
- **D-45:** Show listing **title, source badge (`subito`), zone chip, posted time, and hero photo** above or beside the WebView frame from our canonical schema — not scraped from the iframe — **Reversibility:** reversible.

### Favorites (Pre-Auth)
- **D-46:** Phase 2 favorites persist in **localStorage** (`shoumanwu_favorites`, array of listing UUIDs) — no login required yet; Phase 4 migrates to Supabase-backed user favorites with AUTH-02 login gate — **Reversibility:** costly — Phase 4 needs a migration/import path.
- **D-47:** Favorite toggle available from **list card, map popup, and WebView top bar** without leaving the current view — **Reversibility:** reversible.
- **D-48:** Favorites tab/route (`/favorites`) shows saved listings fetched by ID from Supabase; empty state prompts browsing the map — **Reversibility:** reversible.

### Login-Optional Browsing
- **D-49:** **No login wall** anywhere in Phase 2 — full map/list/detail/browse without account; auth gates deferred entirely to Phase 4 — **Reversibility:** reversible.
- **D-50:** Post tab and Settings profile show **non-blocking stubs** ("Accedi per pubblicare" / profile placeholder) — functional UGC and auth come in Phases 3–4 — **Reversibility:** reversible.

### UI Language (Pre-i18n)
- **D-51:** Ship Phase 2 UI copy in **Italian** (primary audience) with strings centralized in a `messages/it.ts` constants module — English/Chinese toggles deferred to Phase 5 — **Reversibility:** reversible.
- **D-52:** Listing **titles remain as scraped** (Italian from Subito); only app chrome is translated — **Reversibility:** reversible.

### Component Library
- **D-53:** Use **shadcn/ui** (Radix-based) for bottom sheet, dialog, and toast primitives; style with Stitch tokens from `DESIGN.md`, not default shadcn palette — **Reversibility:** reversible.

### Claude's Discretion
- Exact OpenFreeMap vs MapTiler tile style URL
- Whether iframe sandbox attributes allow scripts (prefer restrictive sandbox; fall back to top-level redirect if Subito blocks embed)
- Pull-to-refresh implementation (native overscroll vs button)
- Map pin clustering threshold (enable clustering only if > ~50 visible pins)
- Favorites empty-state illustration/copy
- Server vs client component split per route

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — product vision, map-first UX, scraped deep-link pattern, budget constraints
- `.planning/REQUIREMENTS.md` — DISC-01–07, SCRP-04 definitions and traceability
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, dependency on Phase 1

### Phase 1 Context & Artifacts
- `.planning/phases/01-scraper-foundation-listing-data-model/01-CONTEXT.md` — locked schema, zone tagging, expiry field, source discriminator decisions (D-01–D-23)
- `.planning/phases/01-scraper-foundation-listing-data-model/01-UI-SPEC.md` — Stitch design authority for Phase 2+ frontend
- `supabase/migrations/002_listings_schema.sql` — canonical `listings` table shape and enums
- `scraper/src/shared/schema.ts` — Zod canonical listing schema (must match UI types)

### Research & Architecture
- `.planning/research/STACK.md` — Next.js + Supabase + MapLibre + shadcn recommendations
- `.planning/research/ARCHITECTURE.md` — map+list UI, WebView shell, zone-at-ingestion pattern, project structure
- `.planning/research/PITFALLS.md` — scraping/legal risks (context only; no scraper work in Phase 2)

### Design Reference
- `.planning/google-stitch-ui-design/DESIGN.md` — color, typography, spacing tokens
- `.planning/google-stitch-ui-design/map_explorer_notion_style/code.html` — map + bottom sheet reference
- `.planning/google-stitch-ui-design/listing_feed_notion_style/code.html` — list feed reference
- `.planning/google-stitch-ui-design/item_details_notion_style/code.html` — detail layout reference (adapt for WebView shell)

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — current Vite prototype structure, Stitch→React mapping, anti-patterns to fix
- `.planning/codebase/STACK.md` — current vs planned stack gap
- `.planning/codebase/STRUCTURE.md` — file locations, naming conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/MapView.tsx` — bottom sheet, zone chips, search bar layout (replace decorative map with MapLibre)
- `src/components/ListView.tsx` — bento grid cards, category pills (adapt to listing cards with source badge)
- `src/components/ItemDetailView.tsx` — two-column detail layout (reuse chrome around WebView iframe)
- `src/components/Header.tsx`, `src/components/BottomNav.tsx` — app shell chrome
- `src/index.css` — Tailwind v4 `@theme` tokens; bridge to Stitch `DESIGN.md`
- `src/types.ts` — prototype `Item` shape (migrate to canonical listing type aligned with DB schema)
- `scraper/src/geo/*.geojson` — Venice zone polygons (optional map overlay in Phase 2)

### Established Patterns
- Stitch Structured Minimalist: inline Tailwind, Material Symbols icons, Notion-adjacent neutrals + orange accent
- Phase 1: single `listings` table, `source` enum, zone at ingestion — UI reads, never re-tags
- Anti-patterns to **avoid**: tab-state routing without URLs, mock geo pins, monolithic `App.tsx` state — migrate away in Phase 2

### Integration Points
- Next.js app → Supabase Postgres (anon read via `@supabase/supabase-js`)
- Map pins ← `listings.lat/lng` where non-null
- WebView iframe ← `listings.external_url` for `source = 'subito'`
- Favorites ← localStorage UUID list → Supabase fetch by `id`
- Scraper worker (Phase 1) continues writing to same `listings` table — no Phase 2 write path

</code_context>

<specifics>
## Specific Ideas

- Model browsing UX on Snag's map-first feed but **stay free** — no paywall on map or list.
- Venice geography: zone chips matter more than radius search; walking/bridge constraints make zone filter primary.
- "Claim on Subito" is the happy path for scraped listings — user leaves app intentionally to complete pickup on source site.
- Preserve 手慢无 branding in header; Italian-first chrome even before full i18n.
- **STRICT UI rule:** All Phase 2 screens MUST follow `.planning/google-stitch-ui-design/DESIGN.md` and the matching `*_notion_style/code.html` prototype — side-by-side fidelity required; shadcn only when restyled to Stitch tokens (see `.planning/google-stitch-ui-design/SKILL.md`).

</specifics>

<deferred>
## Deferred Ideas

- UGC quick-post and Street Dump — Phase 3
- In-app DM, reserve/mark-as-sent — Phase 3
- Login gates (Google/Apple/email) — Phase 4
- Supabase-backed favorites sync — Phase 4 (migrate from localStorage)
- Push alerts and keyword matching — Phase 4
- Full trilingual UI (EN/ZH toggle) — Phase 5
- FB Marketplace scraped listings in UI — v2 (SCRP-07)
- Report/claim-expired moderation button — Phase 3 (MOD-01)
- Real-time listing updates / websockets — unnecessary given 1–2 hr scraper cadence
- Native mobile app — v2 (PLAT-01)

</deferred>

---

*Phase: 02-Map + List Core Browsing*
*Context gathered: 2026-07-28 (auto mode)*
