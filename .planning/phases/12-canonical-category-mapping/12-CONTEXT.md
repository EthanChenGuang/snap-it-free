# Phase 12: Canonical Category Mapping - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 delivers a **unified canonical category mapping layer** across listing sources (Subito scraped, UGC, future Facebook stub). Canonical category IDs are the **17 Subito regalo slugs** from `SUBITO_REGALO_CATALOG`.

**User-directed scope pivot:** Category folder grid (original FAV-01–03) is **deferred**. Favorites tab **stays the current flat two-column grid** — no folder tiles, no drill-down routes, no folder empty states.

Phase 12 focuses on:
1. `resolveCanonicalCategorySlug(listing)` — single resolver API
2. UGC posts persist `listing.category` slug at insert time (PostCategory → slug map)
3. Mapping module + unit tests + documented slug tables (CAT-03)
4. FilterSheet category checklist **unchanged** (17 Subito labels; internal plumbing only)

Requirements in scope: **CAT-01–03** (new), **I18N-01** (partial — only if UGC/post strings change).

**Explicitly out of scope:** Favorites folder UI (FAV-01–03 deferred to v3+); FilterSheet merged category groups; one-time UGC backfill migration; DB schema changes; grid card category display (Phase 11 locked hide category on grid); title inference removal.

</domain>

<decisions>
## Implementation Decisions

### Scope Pivot (user-directed)

- **D-01:** **No folder UI** — `/favorites` remains flat two-column `ListListingCard` grid; no folder tiles, no `/favorites/[folder]` drill-down. — **Reversibility:** reversible — UI-only; folders can be added in a future phase.
- **D-02:** **Phase 12 = canonical category mapping** — cross-source normalization infrastructure, not favorites IA. — **Reversibility:** reversible — planning artifact.
- **D-03:** **Defer FAV-01–03 to v3+ backlog** — folder grid requirements move out of active v2.0 scope; note "blocked on canonical mapping; user chose flat favorites for v2.0". — **Reversibility:** reversible — requirements traceability update.

### Canonical Category Model

- **D-04:** **Canonical IDs = 17 Subito slugs** — `SUBITO_REGALO_CATALOG` slugs are the canonical category enum; no merged/smaller set. — **Reversibility:** costly — downstream filters, display, and future folders assume these IDs.
- **D-05:** **Primary API: `resolveCanonicalCategorySlug(listing)`** — returns canonical slug or `null`; replaces scattered logic across `subito-categories.ts`, `listing-fields.ts`, and ad-hoc inference. — **Reversibility:** costly — many call sites migrate to single resolver.
- **D-06:** **Resolution order** — (1) `listing.category` DB column if set → validate/normalize to canonical slug; (2) source-specific mapping (UGC PostCategory, future Facebook); (3) title keyword inference (`inferListingCategory`); (4) `null` (uncategorized). — **Reversibility:** reversible — logic in one module.
- **D-07:** **Keep title inference as last-resort fallback** — do not deprecate `lib/listings/categories.ts` keyword inference. — **Reversibility:** reversible.
- **D-08:** **Uncategorized filter behavior unchanged** — listings with no resolvable category excluded when specific categories selected (Phase 10 D-44); visible when no category filter active. — **Reversibility:** reversible.
- **D-09:** **Extensible source map with Facebook stub** — mapping module accepts `ListingSource`; `facebook` returns `null` until SCRP-07; architecture ready for future sources. — **Reversibility:** reversible.

### UGC Category Persistence

- **D-10:** **Write `listing.category` on UGC post** — stop burying category only in description metadata; map at insert time. — **Reversibility:** costly — touches PostForm + insert API; improves all consumers.
- **D-11:** **PostCategory → Subito slug preset map:**
  - `furniture` → `arredamento-casalinghi`
  - `tech` → `informatica`
  - `books` → `libri-riviste`
  - `apparel` → `abbigliamento-accessori`
  - `kitchenware` → `arredamento-casalinghi`
  - `others` → `usato`
  — **Reversibility:** reversible — mapping table in code.
- **D-12:** **UGC post UI unchanged** — PostForm keeps 6 friendly PostCategory labels; slug mapping is server-side at insert. — **Reversibility:** reversible.
- **D-13:** **Runtime-only backfill** — new UGC posts write category column; existing UGC rows not bulk-migrated (may remain uncategorized until re-posted or touched). — **Reversibility:** reversible — optional backfill script can be added later.

### Filter & Consumer Integration

- **D-14:** **FilterSheet UI unchanged** — 17 Subito category checkboxes and labels remain as today; mapping module is internal plumbing. — **Reversibility:** reversible.
- **D-15:** **Favorites UI unchanged** — no category display on favorites grid cards (Phase 11 D-13 locked). — **Reversibility:** reversible.
- **D-16:** **Mapping consumers this phase** — FilterSheet filter matching (`matchesAnySubitoCategories` refactor), `resolveListingCategory` display helper, UGC insert path; future folder/display features consume same resolver. — **Reversibility:** reversible.

### Documentation & Module Location

- **D-17:** **Code module + CONTEXT.md summary** — e.g. `lib/listings/canonical-categories.ts` (or `lib/listings/resolve-canonical-category.ts`) with unit tests; full slug tables documented in module + CONTEXT.md. — **Reversibility:** reversible.
- **D-18:** **Subito scraped listings** — already store Subito slug in `listing.category` from scraper normalize; resolver validates slug is in catalog or maps unknown → null. — **Reversibility:** reversible.

### Roadmap & Requirements Updates (plan-phase Wave 0)

- **D-19:** **Rename phase** — ROADMAP Phase 12: "Canonical Category Mapping" (slug: `12-canonical-category-mapping`). — **Reversibility:** reversible — docs only.
- **D-20:** **FAV-01–03 → v3+ deferred** in REQUIREMENTS.md traceability. — **Reversibility:** reversible.
- **D-21:** **Add CAT-01–03 requirements:**
  - **CAT-01:** `resolveCanonicalCategorySlug` resolves Subito, UGC, and inference paths
  - **CAT-02:** New UGC posts persist canonical slug in `listing.category`
  - **CAT-03:** Slug mapping tables documented and covered by unit tests
  — **Reversibility:** reversible — requirements docs.
- **D-22:** **Success criteria (ROADMAP):** (1) resolver works for Subito/UGC/inference, (2) new UGC posts persist category slug, (3) mapping documented + tests pass, (4) FilterSheet behavior unchanged. — **Reversibility:** reversible.
- **D-23:** **Planner updates ROADMAP.md + REQUIREMENTS.md + PROJECT.md** during `/gsd-plan-phase` Wave 0 (not during discuss). — **Reversibility:** reversible.
- **D-24:** **PROJECT.md goal #4** — change from "Category folder grid with drill-down" → "Canonical category mapping across sources". — **Reversibility:** reversible.

### Claude's Discretion

- Exact module filename and export names (`canonical-categories.ts` vs `resolve-canonical-category.ts`).
- Whether `matchesSubitoCategory` / `matchesAnySubitoCategories` delegate to resolver or share internal helper.
- UGC insert API route vs server action wiring for category slug persistence.
- Validation/normalization for unknown slugs already in DB (pass-through vs null).
- Test file location and coverage depth for PostCategory map + inference fallback chains.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — v2.0 milestone; goal #4 to update (D-24)
- `.planning/REQUIREMENTS.md` — FAV-01–03 defer, CAT-01–03 add (D-20, D-21)
- `.planning/ROADMAP.md` — Phase 12 rename + success criteria rewrite (D-19, D-22)
- `.planning/STATE.md` — current phase pointer

### Prior Phase Context
- `.planning/phases/10-search-filter-sheet-distance/10-CONTEXT.md` — Category multi-select OR logic (D-40, D-44); FilterSheet uses Subito slugs (D-42)
- `.planning/phases/11-grid-listing-cards/11-CONTEXT.md` — Hide category on grid (D-13); favorites flat grid unchanged
- `.planning/phases/09-feed-first-home-navigation-ia/09-CONTEXT.md` — Favorites interim flat grid (D-33); folders originally Phase 12

### Design Authority
- `.planning/google-stitch-ui-design/DESIGN.md` — Stitch tokens (no UI change expected this phase)

### Codebase Maps
- `.planning/codebase/STRUCTURE.md` — component locations
- `.planning/codebase/CONVENTIONS.md` — i18n, module patterns

### Category Source Touchpoints
- `lib/admin/subito-regalo-catalog.ts` — 17 canonical Subito slugs + Italian labels
- `lib/listings/subito-categories.ts` — `matchesSubitoCategory`, `matchesAnySubitoCategories`, `getSubitoCategoryLabel`
- `lib/listings/categories.ts` — title keyword inference (`inferListingCategory`)
- `lib/i18n/listing-fields.ts` — `resolveListingCategory` display helper
- `components/ugc/PostForm.tsx` — PostCategory enum (6 values); currently writes category to description only
- `components/listings/FilterSheet.tsx` — category checklist UI (unchanged)
- `components/listings/FavoritesPageClient.tsx` — flat grid (unchanged)
- `scraper/src/shared/normalize.ts` — extracts Subito slug from URL into `listing.category`
- `lib/listings/types.ts` — `ListingRow.category`, `ListingSource`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SUBITO_REGALO_CATALOG` — authoritative 17-slug canonical set
- `matchesSubitoCategory` / `matchesAnySubitoCategories` — filter matching to refactor onto resolver
- `inferListingCategory` + `legacySlugFromInferred` — existing inference → slug bridges
- `resolveListingCategory` — display path; should consume canonical slug from resolver
- `PostForm` PostCategory picker — 6 UGC-friendly labels; wire slug at insert
- Scraper `extractCategoryFromSubitoUrl` — Subito listings already have slug in DB

### Established Patterns
- DB `listing.category` preferred over title inference (Phase 10 D-29 / subito-categories comment)
- FilterSheet uses full 17-slug checklist with trilingual labels via `getSubitoCategoryLabel`
- i18n via `messages/{zh,en,it}.ts`; category_en/category_zh columns for translated labels
- Phase 10 pattern: lib module + TDD Wave 0 before UI wiring

### Integration Points
- **New `lib/listings/canonical-categories.ts`** — `resolveCanonicalCategorySlug`, PostCategory map, source stubs
- **`components/ugc/PostForm.tsx` + insert API** — persist slug on create (D-10, D-11)
- **`lib/listings/subito-categories.ts`** — delegate matching to canonical slug resolution
- **`lib/i18n/listing-fields.ts`** — simplify `resolveListingCategory` using resolver
- **`hooks/useDistanceCenter.ts` / FilterSheet pipeline** — `matchesAnySubitoCategories` uses resolved slug
- **No changes** to `FavoritesPageClient` layout or routes

</code_context>

<specifics>
## Specific Ideas

- User explicitly rejected category folders: "Remove folders from the favorites list and save all into a unified folder/list."
- User wants cross-source mapping: "Define a mapping between database category and categories scraped from different websites (Subito, UGC, and others)."
- Snag folder screenshots remain interaction reference only — not implemented this milestone for favorites.
- Filter UX stays granular (17 Subito categories) even though canonical model could support future merging.

</specifics>

<deferred>
## Deferred Ideas

### Favorites Category Folders (FAV-01–03 → v3+)
- Five folder tiles (Furniture, Electronics, Home & Garden, For Kids, Other) with counts and drill-down — deferred until user opts back in; canonical mapping is prerequisite infrastructure.
- Folder tile design, drill-down navigation, folder empty states — discussion areas selected but N/A per scope pivot.

### From REQUIREMENTS.md v3+ backlog
- **FAV-04:** Edit/reorder favorites folders — remains v3+; depends on folders returning.

### Other deferred (out of phase)
- One-time UGC category backfill migration script
- FilterSheet merged category groups (fewer checkboxes)
- Category display on favorites grid cards
- Facebook scraper category mapping (SCRP-07) — stub only this phase

</deferred>

---

*Phase: 12-Canonical Category Mapping*
*Context gathered: 2026-08-10*
