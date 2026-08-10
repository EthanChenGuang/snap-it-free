# Phase 13: Select Location Flow - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 13 completes the **Select Location** experience for two contexts: **browse** (filter center + radius on `/select-location`) and **post** (UGC pickup coordinates via the same screen with `?context=post`). Delivers LOC-01–03: full-screen MapLibre picker with fixed tap-to-place pin, locate-me FAB, live city preview, Confirm; browse confirm persists filter center via existing `applyMapFilterPrefs`; post confirm persists lat/lng/label to PostForm session draft without touching browse prefs.

Phases 9–10 established `/select-location`, browse-center storage, radius-on-map for browse, and feed header entry. Phase 13 adds **post-flow integration** (replace GPS toggle), **dynamic city preview** (replacing static placeholder), **context-aware UI** (hide radius in post), and **Stitch visual polish**.

Requirements in scope: **LOC-01–03**, **I18N-01** (partial — new context-specific strings).

**Explicitly out of scope:** Reverse geocode / street addresses; filter sheet radius controls (radius stays on map for browse); settings/alerts changes; browse-all-pins map; full PostForm session draft (photo/title — location fields only this phase); server-side PostGIS queries.

</domain>

<decisions>
## Implementation Decisions

### Dual Entry: Browse vs Post (LOC-03)

- **D-01:** Single route **`/select-location`** with query param **`?context=post`** for post flow; missing or invalid `context` defaults to **browse**. — **Reversibility:** costly — routing, confirm behavior, and i18n branch on this param.
- **D-02:** **Replace GPS toggle** on `PostForm` with a **tappable location row** (preview text + chevron) that navigates to `/select-location?context=post`. — **Reversibility:** costly — removes existing pinLocation toggle UX.
- **D-03:** Post-context map **initial position:** saved post-draft coords if present → one-shot GPS → Venice default `(45.44, 12.33)`. — **Reversibility:** reversible.
- **D-04:** Browse entry remains **feed header pin icon only** (no center pill re-added). — **Reversibility:** reversible.
- **D-05:** Post context reachable **only from PostForm** after auth gate — not deep-linkable externally. — **Reversibility:** reversible.
- **D-06:** Browse select-location works **logged out** (current behavior). — **Reversibility:** reversible.
- **D-07:** **Independent storage:** post coords in `sessionStorage` draft; browse center in `shoumanwu_browse_center` — post confirm must **not** update browse center. — **Reversibility:** reversible.
- **D-08:** Context-specific **screen titles** (trilingual): browse — existing "Select Location"; post — **"Set pickup location"** (zh/en/it keys to add). — **Reversibility:** reversible.
- **D-09:** Before post location confirmed, row shows **"Tap to set pickup location"** (trilingual); block submit until confirmed. — **Reversibility:** reversible.
- **D-10:** After confirm, post row shows **same city string** as map preview; tap row again to re-open map with coords preloaded. — **Reversibility:** reversible.
- **D-11:** **Derive zone enum** from lat/lng on submit — **hide zone labels** from post UI (aligns with city-only consumer UX). — **Reversibility:** costly — API submit path must map coords → zone.
- **D-12:** Navigating to/from map **preserves other PostForm fields** (photo, title, etc.) — only location fields in session draft this phase. — **Reversibility:** reversible.

### Location Preview (LOC-01)

- **D-13:** Preview shows **city name only** (Venice / Padova trilingual via `messages.feed.cityVenice` / `cityPadova`) — **no reverse geocode**, no raw lat/lng. Satisfies LOC-01 "address/label preview" as city label. — **Reversibility:** reversible.
- **D-14:** Preview **updates live** as pin moves (tap or locate-me). — **Reversibility:** reversible.
- **D-15:** **Replace** static `selectedLocationLabel` placeholder with **live city name** in preview row (`text-body-md text-on-surface`). — **Reversibility:** reversible.
- **D-16:** City from **nearest-centroid heuristic** — reuse / extend existing `resolveCityLabel` (Venice vs Padova). — **Reversibility:** reversible.
- **D-17:** Pins far outside service area still show **nearest city** — no "outside area" error. — **Reversibility:** reversible.
- **D-18:** Browse confirm persists **city name as browse center label** (not "My location" — overrides Phase 10 GPS pill copy for map-confirmed centers). — **Reversibility:** costly — center pill copy logic may need alignment.
- **D-19:** Radius mention **stays separate** from preview row (radius chips on map overlay). — **Reversibility:** reversible.
- **D-20:** Preview uses **`aria-live="polite"`** for screen reader updates. — **Reversibility:** reversible.
- **D-21:** No preview text until map **ready** (keep map loading state); Confirm **enabled** once map ready (any position). — **Reversibility:** reversible.

### Pin Interaction & Map (LOC-01, LOC-02)

- **D-22:** **Tap-to-place** — map click moves pin; **panning without tap does not** move pin (Phase 9 pan-under-pin model superseded). — **Reversibility:** reversible.
- **D-23:** Pin rendered at coordinate via **`SelectLocationPinOverlay`** pixel overlay (current pattern). — **Reversibility:** reversible.
- **D-24:** **Keep red `SelectLocationRedPin`** + **400ms drop animation** on tap/locate — document as **intentional Stitch exception** (like Phase 11 emerald FREE badge). — **Reversibility:** reversible.
- **D-25:** **Keep locate-me FAB** — moves pin to GPS + fly map. — **Reversibility:** reversible.
- **D-26:** **Reuse** `SelectLocationMapPane`, `SelectLocationRedPin`, radius helpers — pass **`context`** prop to hide radius layers in post. — **Reversibility:** reversible.
- **D-27:** Pin visible on load at saved/GPS/Venice position. — **Reversibility:** reversible.
- **D-28:** **OpenFreeMap Liberty** tile style (current). — **Reversibility:** reversible.
- **D-29:** **Auto-fit map bounds** to radius circle on radius preset change + locate-me (`fitMapToRadius`). — **Reversibility:** reversible.
- **D-30:** No special double-tap behavior. — **Reversibility:** reversible.

### Radius: Browse vs Post (LOC-02)

- **D-31:** **Browse context:** keep **5/10/50/100 km preset chips** on map + minimalist radius circle/radar overlay (current quick-task styling). — **Reversibility:** reversible.
- **D-32:** **Post context:** **hide all radius UI** — no preset chips, no circle/radar overlay. — **Reversibility:** reversible.
- **D-33:** Browse confirm calls **`applyMapFilterPrefs(center, radiusKm)`** — enables map mode, radius, resets city to All (current behavior). — **Reversibility:** reversible.
- **D-34:** Post confirm **does not** call `applyMapFilterPrefs` or touch `shoumanwu_filter_prefs`. — **Reversibility:** reversible.

### Confirm & Navigation (LOC-02, LOC-03)

- **D-35:** Browse confirm → **`router.back()`** after persist; triggers **immediate feed re-filter** via existing providers. — **Reversibility:** reversible.
- **D-36:** Post confirm → save to **`sessionStorage` key `shoumanwu_post_draft`** with `{ lat, lng, label, locationConfirmed: true }` → **`router.push('/post')`**. — **Reversibility:** reversible.
- **D-37:** Context-specific **Confirm button** copy (trilingual): browse — existing "Confirm location"; post — **"Confirm pickup location"**. — **Reversibility:** reversible.
- **D-38:** **Back without Confirm:** no side effects — browse center / filter prefs / post draft unchanged. — **Reversibility:** reversible.
- **D-39:** Post submit **blocked** with validation error if `locationConfirmed !== true`. — **Reversibility:** reversible.

### Stitch Visual Polish

- **D-40:** Bottom confirm panel — **flat Stitch:** thin `border-outline-variant`, **`rounded-lg`**, **no drop shadow** (remove current `shadow-[0_4px_24px_...]`). — **Reversibility:** reversible.
- **D-41:** **Minimal header** — back chevron + centered title + `border-b` (current layout, token polish only). — **Reversibility:** reversible.
- **D-42:** Prototype reference: **adapt `map_explorer_notion_style`** — picker-only, no bottom sheet. — **Reversibility:** reversible.
- **D-43:** Radius preset chips — **Stitch light gray pills** (`rounded-full border-outline-variant bg-surface-container-lowest`). — **Reversibility:** reversible.
- **D-44:** Locate-me FAB — **light surface circle** + `border-outline-variant` + `my_location` icon. — **Reversibility:** reversible.
- **D-45:** Preview row — **bordered inner row** with `location_on` icon + city text; flat Stitch (no shadow). — **Reversibility:** reversible.
- **D-46:** **Full viewport** — hide AppChrome header + bottom nav on `/select-location` (current). — **Reversibility:** reversible.

### Claude's Discretion

- Exact `shoumanwu_post_draft` merge logic with any future full-form draft expansion.
- `SelectLocationClient` refactor vs `context` prop on `SelectLocationMapPane` for radius visibility.
- Zone derivation helper location (`lib/geo/zone-from-coords.ts` or extend existing `nearestVeniceZone`).
- i18n key naming for post-specific strings (`selectLocation.postTitle`, `post.confirmPickup`, etc.).
- Locate FAB exact pixel position (map overlay vs safe-area offset).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — v2.0 Select Location milestone goal; map secondary IA
- `.planning/REQUIREMENTS.md` — LOC-01–03, I18N-01 traceability
- `.planning/ROADMAP.md` — Phase 13 goal, success criteria, dependency on Phase 9
- `.planning/STATE.md` — current phase pointer

### Prior Phase Context
- `.planning/phases/09-feed-first-home-navigation-ia/09-CONTEXT.md` — `/select-location` route, minimal chrome, browse center persistence (D-27); pan-under-pin superseded by D-22
- `.planning/phases/10-search-filter-sheet-distance/10-CONTEXT.md` — `applyMapFilterPrefs`, city-only labels, zone chips removed from select-location; GPS "My location" pill copy superseded by D-18 for map confirm

### Design Authority (mandatory for UI)
- `.planning/google-stitch-ui-design/DESIGN.md` — Stitch tokens, monochrome rules, documented exceptions (red pin D-24)
- `.planning/google-stitch-ui-design/map_explorer_notion_style/code.html` — Adapt for select-location picker (strip bottom sheet)
- `.planning/google-stitch-ui-design/post_free_item_notion_style/code.html` — PostForm location row styling reference

### Codebase Maps
- `.planning/codebase/STRUCTURE.md` — Next.js routes, component locations
- `.planning/codebase/CONVENTIONS.md` — i18n, Stitch styling patterns
- `.planning/codebase/ARCHITECTURE.md` — BrowseCenterProvider, filter prefs flow

### Implementation Touchpoints
- `app/select-location/page.tsx` — Route entry
- `components/map/SelectLocationPageClient.tsx` — Dynamic import wrapper
- `components/map/SelectLocationClient.tsx` — Context branching, confirm handlers
- `components/map/SelectLocationMapPane.tsx` — Map, radius overlay, FAB, chips
- `components/map/SelectLocationRedPin.tsx` — Red pin (Stitch exception)
- `components/ugc/PostForm.tsx` — Replace GPS toggle with location row + draft hydration
- `components/shell/FeedHeaderRow.tsx` — Browse entry (pin icon link)
- `components/shell/AppChrome.tsx` — Full-viewport chrome hide
- `lib/filter-prefs/mode-transitions.ts` — `applyMapFilterPrefs` (browse confirm only)
- `lib/browse-center/storage.ts` — Browse center persistence (browse only)
- `lib/filter-prefs/storage.ts` — `SELECT_LOCATION_RADIUS_OPTIONS`
- `messages/zh.ts`, `messages/en.ts`, `messages/it.ts` — Context-specific strings

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SelectLocationClient` + `SelectLocationMapPane` — Full browse flow with radius, radar, locate FAB, confirm panel (extend with `context` prop)
- `applyMapFilterPrefs` — Browse confirm persistence (center + map mode + radius)
- `resolveCityLabel` in `SelectLocationClient` — Nearest-city preview (promote to shared util)
- `BrowseCenterProvider` — Immediate feed update on browse confirm
- `FeedHeaderRow` — Pin icon entry with map-mode indicator dot

### Established Patterns
- `?context=` query param pattern acceptable for mode branching (use `useSearchParams`)
- `sessionStorage` for ephemeral draft state; `shoumanwu_*` key prefix
- Stitch semantic Tailwind tokens; intentional color exceptions documented in CONTEXT
- i18n via `useMessages()` + trilingual keys in `messages/{zh,en,it}.ts`
- Full-viewport routes hide AppChrome header/nav (`isSelectLocation` early return)

### Integration Points
- **`PostForm`** — Remove `pinLocation` toggle + zone label line; add location row → `/select-location?context=post`; read/write `shoumanwu_post_draft`
- **`SelectLocationClient`** — Branch on `context`: hide radius UI, skip `applyMapFilterPrefs`, different titles/confirm copy/return navigation
- **`SelectLocationMapPane`** — Accept `showRadiusControls: boolean` (false for post)
- **Submit validation** — `PostForm.handleSubmit` checks `locationConfirmed`
- **Zone on API** — Derive from lat/lng at submit (replace manual zone display)

</code_context>

<specifics>
## Specific Ideas

- User chose exhaustive discussion across all six gray areas — post flow is the main net-new work; browse flow is polish + preview + Stitch alignment.
- Radius on map for browse is **confirmed** (not moving back to filter sheet) after user clarification.
- Red pin retained as visible landmark with documented Stitch exception (analogous to Phase 11 emerald FREE badge).
- City-only preview satisfies LOC-01 without geocoding API — consistent with Phase 10 "city name only, never zone" directive.

</specifics>

<deferred>
## Deferred Ideas

- **Reverse geocode / street address preview** — city label sufficient for LOC-01; geocoding API deferred
- **Full PostForm sessionStorage draft** (photo, title, description) — location fields only in Phase 13
- **Deep-link `/select-location?context=post`** — intentionally blocked; PostForm-only entry
- **Re-add browse center pill to feed header** — user chose header pin icon only
- **"My location" label for GPS-derived browse center** — superseded by city name on map confirm (D-18)
- **Migrate keyword alerts to city-only** — still deferred from Phase 10

</deferred>

---

*Phase: 13-Select Location Flow*
*Context gathered: 2026-08-10*
