# Phase 10: Search, Filter Sheet & Distance - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 delivers the **filter bottom sheet** (km radius + category multi-select + city filter), **active filter pills** below the search bar, **client-side haversine** distance filtering/sorting, and **basic distance metadata** on grid cards. Phase 9's filter stub toast is replaced with a real sheet; browse center from `/select-location` becomes the primary distance reference.

Requirements in scope: **FILT-01–05** (with documented consumer UX override for FILT-04), **I18N-01** (partial — filter sheet, pills, new chrome strings).

**Explicitly out of scope:** Grid card polish — FREE badge, heart layout (Phase 11); favorites folders (Phase 12); full Select Location for UGC post (Phase 13); settings/alerts migration to city-only (alerts keep zone granularity this phase); server-side PostGIS radius queries.

</domain>

<decisions>
## Implementation Decisions

### Requirement Overrides (user-directed)

- **D-01:** **City-only consumer filter** — Replace Venice zone chips (Centro / Mestre / Lido) with **All · Venice · Padova** in filter sheet and pills. **Never show zone names** in consumer UI again; show **city name only**. — **Reversibility:** costly — supersedes FILT-04 zone-chip UX and Phase 9 D-22; touches filter sheet, pills, cards, select-location, i18n.
- **D-02:** **Data layer retains zone enum** — Map `centro_storico` / `mestre_marghera` / `lido_murano` → Venice, `padova` → Padova for city filter logic; do not migrate schema this phase. — **Reversibility:** reversible — consumer-only hide.
- **D-03:** **Keyword alerts unchanged** — Settings alert zone picker keeps existing zone granularity; city-only browse filter does not migrate alerts in Phase 10.

### Radius Center & Distance Reference

- **D-04:** **Browse center primary** — Haversine center = user-confirmed pin from `/select-location` when saved.
- **D-05:** **GPS fallback** — When no browse center, use one-shot device geolocation for center.
- **D-06:** **Radius without saved center** — If user adjusts radius slider before confirming a pin, auto-use GPS as temporary center (or Venice default per D-08 if GPS unavailable).
- **D-07:** **Immediate re-filter on center change** — Confirm location on map updates feed filter/sort immediately (not gated by filter sheet Apply).
- **D-08:** **GPS denied fallback** — Use Venice default center `(45.44, 12.33)` when browse center unset and GPS unavailable.
- **D-09:** **Browse center wins over GPS** — Once user confirms a pin, ignore GPS for filtering/distance until center cleared.
- **D-10:** **One-shot GPS only** — No `watchPosition`; read GPS once on load / when needed.
- **D-11:** **Nearest-first sort** — When any center is active, sort feed by ascending distance (replaces Phase 9 newest-first D-41 while center active).
- **D-12:** **Clear center chain** — Dismissing center pill clears browse center → revert to GPS → Venice default.
- **D-13:** **Center indicator pill** — Show trilingual label (pin label, or "My location" for GPS); tap opens `/select-location`; × clears center per D-12.
- **D-14:** **Default radius 10 km** — When user first enables radius (FILT-01 range 1–50 km).
- **D-15:** **Smart distance units** — `"350 m"` under 1 km; `"2.3 km"` at 1 km+; always metric.
- **D-16:** **Radius off = no radius filter** — Separate toggle/checkbox off slider; off shows all listings (city/category/search still apply).
- **D-17:** **Persist radius** — Save to `localStorage` in `shoumanwu_filter_prefs` (FILT-01).
- **D-18:** **GPS center pill copy** — zh: 我的位置 / en: My location / it: La mia posizione.
- **D-19:** **Distance on cards when radius off** — Still show distance labels whenever a center exists, even if radius filter disabled.
- **D-20:** **Confirm location sync** — `/select-location` Confirm updates active center immediately without opening filter sheet.
- **D-21:** **Pure geographic radius** — Haversine circle not constrained by city filter; city filter is separate AND composition.
- **D-22:** **Client-side haversine** — Compute in browser on listing lat/lng per FILT-05; no PostGIS query changes.

### Listings Without Coordinates (FILT-05)

- **D-23:** **Exclude when radius ON** — Listings missing lat or lng hidden from results when radius filter active.
- **D-24:** **Show when radius OFF** — No-coord listings appear normally in feed.
- **D-25:** **Card metadata** — Omit distance segment; show time-only (or city per D-38) for no-coord listings.
- **D-26:** **Empty state** — Reuse existing `feed.emptySearchTitle` / `emptySearchDescription`; no radius-specific copy.
- **D-27:** **Both coordinates required** — Treat as no-coord if either lat or lng is null.
- **D-28:** **Same rule for UGC and scraped** — No special casing by source type.
- **D-29:** **Filter composition order** — Text search → radius → city → categories (all AND together).
- **D-30:** **No hidden-count hint** — Do not surface "listings hidden due to missing location" in UI.

### City Filter (replaces zone chips)

- **D-31:** **Filter sheet city options** — All · Venice · Padova (single-select).
- **D-32:** **Remove zone chips from `/select-location`** — Map pan-only for center pin; city filter lives in filter sheet only.
- **D-33:** **Dismissible city pill** — When Venice or Padova selected, show pill (e.g. "Venice ×"); dismiss resets to All.
- **D-34:** **City from data field** — Derive city from listing zone enum, not geo boundary inference.
- **D-35:** **AND with radius/search/categories** — All active filters compose together.
- **D-36:** **Trilingual city names** — zh: 威尼斯/帕多瓦 · en: Venice/Padova · it: Venezia/Padova.
- **D-37:** **City filter independent of pin** — Confirm location sets center only; does not auto-set city filter.
- **D-38:** **City on cards without distance** — When no center for distance, show city name (Venice/Padova) in card metadata; never zone subdivisions.

### Category Multi-Select (FILT-01)

- **D-40:** **OR logic** — Multiple selected categories = union (match ANY).
- **D-41:** **One pill per category** — Each selected category gets its own dismissible pill.
- **D-42:** **Checkbox list in sheet** — Vertical checklist using existing `SUBITO_CATEGORY_SLUGS` + trilingual labels.
- **D-43:** **None selected = All** — Empty category selection shows all categories; include "Clear selection" link.
- **D-44:** **Uncategorized listings** — Visible when no category filter active; excluded when specific categories selected.
- **D-45:** **AND with search** — Must match search text AND category filter.
- **D-46:** **Dismiss one category** — Removing a category pill removes only that slug; last removal → All.
- **D-47:** **Persist categories** — Save selected category slugs in `shoumanwu_filter_prefs`.
- **D-48:** **Sheet section order** — Radius → City → Categories (top to bottom).
- **D-49:** **No live result count** — Apply button text only; no `"Apply (24 results)"` preview.
- **D-50:** **Migrate to multi-select array** — Replace `FeedScrollContext.selectedCategory: string` with `FeedFilterContext.selectedCategories: string[]`.

### Filter Sheet Apply Flow (FILT-02)

- **D-51:** **Draft then Apply** — Sheet edits are draft until Apply; closing without Apply discards draft.
- **D-52:** **Reset scope** — Reset clears radius (off), city (All), categories (none/all); does **NOT** clear browse center or search query.
- **D-53:** **Close discards draft** — Swipe down / tap overlay closes without applying pending changes.
- **D-54:** **Footer buttons** — Reset (secondary text) + Apply (primary black) sticky footer; Stitch primary pattern.
- **D-55:** **Prefill on open** — Draft controls initialize from currently applied filter state.
- **D-56:** **Filter icon dot badge** — Small indicator when any filter active (radius on, city not All, or categories selected).
- **D-57:** **Reuse Vaul Drawer** — `components/ui/drawer.tsx` restyled to Stitch tokens; new `FilterSheet` wrapper acceptable.
- **D-58:** **Radius control** — Slider 1–50 km when enabled; separate Off toggle disables radius filter.
- **D-59:** **Replace filter stub** — Filter button opens bottom sheet; remove Phase 9 `filterComingSoon` toast (D-03 Phase 9).

### Distance on Cards (Phase 10 vs 11 split)

- **D-60:** **Basic distance in Phase 10** — Add distance + time metadata line to `ListListingCard` now; Phase 11 polishes FREE badge / heart / layout only.
- **D-61:** **Metadata format** — `"{distance} · {time}"` when both available (smart units per D-15).
- **D-62:** **Placement** — Secondary line below truncated title on `ListListingCard`.
- **D-63:** **No center fallback** — Show city name or time-only when distance unavailable.
- **D-64:** **Live recompute** — Card distances update immediately when center changes.
- **D-65:** **Phase 11 reuses pipeline** — Phase 11 does not rework haversine/distance logic.

### Active Pills & Search Row

- **D-66:** **Pill order** — Search → Center → Radius → City → Categories (left to right).
- **D-67:** **Radius pill label** — Trilingual "Within X km" (zh: X公里内 · en: Within X km · it: Entro X km).
- **D-68:** **Pill wrapping** — `flex-wrap` multiline; no horizontal scroll on pills row.
- **D-69:** **Search pill** — Show dismissible pill when search query non-empty; dismiss clears input immediately.
- **D-70:** **Live search** — Search filters as user types; not part of filter sheet draft/Apply flow.

### Filter Sheet Chrome & State

- **D-71:** **Sheet title** — Trilingual "Filters" (zh: 筛选 · en: Filters · it: Filtri).
- **D-72:** **Sheet height** — Auto height capped ~85vh; scroll inside for long category list.
- **D-73:** **Dismiss affordances** — Swipe down + tap overlay; no X button.
- **D-74:** **Stitch monochrome** — Thin borders, no drop shadow on sheet; per DESIGN.md.
- **D-75:** **FeedFilterContext** — New context holding `appliedFilters` + `draftFilters`; keep scroll/search in `FeedScrollContext`.
- **D-76:** **localStorage key** — Single `shoumanwu_filter_prefs` JSON: `{ radiusKm, radiusEnabled, city, categories[] }`.
- **D-77:** **Draft in memory only** — Applied filters persisted; draft lost on refresh until Apply.
- **D-78:** **Hydrate on client mount** — SSR unfiltered; client reads localStorage (same pattern as browse center).

### Internationalization (I18N-01 partial)

- **D-79:** **messages.feed.*** namespace — All new filter strings in `messages/{zh,en,it}.ts` feed section.
- **D-80:** **Trilingual section labels** — Radius / City / Categories headings, Apply / Reset / Clear selection, pill templates.
- **D-81:** **Remove stub strings** — Delete `filterComingSoon` keys once sheet ships.
- **D-82:** **Empty state** — Reuse `feed.emptySearch*` strings; no new radius-empty copy.

### Claude's Discretion

- `FeedFilterContext` vs `FilterSheet` file layout and provider wiring in `AppChrome`.
- Haversine util location (e.g. `lib/geo/haversine.ts`) and unit-formatting helper.
- Exact search pill truncation length for long queries.
- Radius slider step size (default 1 km).
- Drawer height/snap tuning within 85vh constraint.
- Whether center pill shows browse-center `label` from Confirm or computed nearest city name.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — v2.0 milestone; distance + filter goals; note city-only override of zone UX
- `.planning/REQUIREMENTS.md` — FILT-01–05, I18N-01 traceability (FILT-04 interpreted as city filter this phase)
- `.planning/ROADMAP.md` — Phase 10 goal, success criteria, dependency on Phase 9
- `.planning/STATE.md` — current phase pointer

### Prior Phase Context
- `.planning/phases/09-feed-first-home-navigation-ia/09-CONTEXT.md` — Feed header stub (D-03), browse center persistence (D-27), zone chips on select-location (D-22 — **retired by D-32**), single-category state (migrated by D-50)

### Design Authority (mandatory for UI)
- `.planning/google-stitch-ui-design/DESIGN.md` — Stitch tokens, monochrome sheet, pill styling, primary button
- `.planning/google-stitch-ui-design/listing_feed_notion_style/code.html` — Feed + search row reference (adapt for pills row + filter sheet)

### Codebase Maps
- `.planning/codebase/STRUCTURE.md` — Next.js routes, component locations
- `.planning/codebase/CONVENTIONS.md` — i18n, Stitch styling patterns
- `.planning/codebase/STACK.md` — Next.js App Router, Vaul drawer

### Implementation Touchpoints
- `components/shell/FeedHeaderRow.tsx` — Replace filter stub; wire pills row + sheet open + dot badge
- `components/shell/FeedScrollContext.tsx` — Scroll-away + live search; migrate category state out
- `components/listings/FeedHomeClient.tsx` — Filter pipeline: search → haversine → city → categories → sort
- `components/listings/ListListingCard.tsx` — Add distance · time metadata line (D-60–64)
- `components/listings/SubitoCategoryFilterChips.tsx` — Reference for category labels (sheet checklist, not inline feed)
- `components/map/SelectLocationClient.tsx` — Remove zone chips (D-32); center pin unchanged
- `components/ui/drawer.tsx` — Vaul bottom sheet primitive for filter sheet
- `lib/browse-center/storage.ts` — Browse center persistence (`shoumanwu_browse_center`)
- `lib/browse-center/context.tsx` — `useBrowseCenter()` for distance center
- `lib/listings/filters.ts` — Extend with haversine + city mapping helpers
- `lib/listings/subito-categories.ts` — Category slugs, labels, `matchesSubitoCategory` (extend for multi OR)
- `messages/zh.ts`, `messages/en.ts`, `messages/it.ts` — Filter sheet + pill strings

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FeedHeaderRow` — Search row + partial single-category pill + filter stub toast → replace stub, expand pills
- `FeedScrollContext` — Search query + scroll-away; migrate filter state to new `FeedFilterContext`
- `FeedHomeClient` — Filter pipeline shell; extend with haversine, city, multi-category, nearest-first sort
- `SubitoCategoryFilterChips` / `subito-categories.ts` — Category slug catalog + trilingual labels for sheet checklist
- `components/ui/drawer.tsx` — Vaul drawer for bottom sheet
- `BrowseCenterProvider` + `lib/browse-center/storage.ts` — Center pin persistence for haversine reference
- `lib/listings/filters.ts` — `filterByZone`, `excludeReportedIds`; add haversine + city-from-zone mapping
- `SelectLocationClient` — Remove `SelectLocationZoneChips`; keep map pan + Confirm
- `ListListingCard` — Add metadata line below title for distance · time / city

### Established Patterns
- Stitch `@theme` semantic Tailwind classes; monochrome pills (`rounded-full border border-outline-variant bg-surface-container-lowest`)
- `localStorage` keys prefixed `shoumanwu_`; custom event for cross-tab sync (browse center pattern)
- i18n via `useMessages()` + `messages/{zh,en,it}.ts`
- Client-side filter composition in `useMemo` (existing search + single category pattern)
- Dynamic import caution for heavy overlays (apply to FilterSheet if needed)

### Integration Points
- **`FeedHeaderRow`** — Open FilterSheet; render full pills row; filter icon dot badge
- **New `FilterSheet` component** — Draft state, Radius/City/Categories sections, Apply/Reset footer
- **New `FeedFilterContext`** — Applied vs draft filters; hydrate from `shoumanwu_filter_prefs`
- **`FeedHomeClient`** — Compose filters; nearest-first sort; pass distance to cards
- **`app/layout.tsx`** — Wrap with `FeedFilterProvider` alongside existing providers
- **Retire** — `filterComingSoon` toast; consumer zone chip UI on select-location; single `selectedCategory` in FeedScrollContext

</code_context>

<specifics>
## Specific Ideas

- User directive: **"From now on, show the city name only, never show the zone name again"** — drives D-01, D-32, D-38 and FILT-04 override.
- Snag reference app remains interaction benchmark only; Stitch monochrome for sheet/pills.
- Phase 9 established browse center without feed filtering — Phase 10 activates that deferred behavior (09-CONTEXT deferred section).
- User explored radius center thoroughly (19 decisions) — treat center reference rules as locked, not planner discretion.

</specifics>

<deferred>
## Deferred Ideas

- **Migrate keyword alerts to city-only** — Alerts settings keep zone picker; city migration is a later phase (D-03).
- **Live result count in filter sheet** — User rejected `"Apply (N results)"` preview (D-49).
- **Radius-specific empty state copy** — Use generic empty search strings (D-26, D-82).
- **Grid card FREE badge / heart polish** — Phase 11 (CARD-01–05).
- **Full Select Location for UGC post coordinates** — Phase 13.
- **Server-side PostGIS radius queries** — Out of scope; client haversine only (D-22).
- **Browse-all-pins map view** — Still not requested (from Phase 9 deferred).

</deferred>

---

*Phase: 10-Search, Filter Sheet & Distance*
*Context gathered: 2026-08-10*
