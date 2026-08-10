# Phase 12: Canonical Category Mapping - Research

**Researched:** 2026-08-10
**Domain:** Cross-source listing category normalization (Subito slugs, UGC PostCategory, title inference)
**Confidence:** HIGH

## Summary

Phase 12 is a **lib-layer refactor** with one API touchpoint — no new npm packages, no FilterSheet/Favorites UI changes, no DB schema migration. Today category logic is scattered across three files with duplicated slug maps: `legacySlugFromInferred` in `lib/listings/subito-categories.ts`, an identical `slugMap` in `lib/i18n/listing-fields.ts`, and UGC category buried only in description metadata (`PostForm` → `/api/ugc/listings` never writes `listing.category`).

The locked model uses **17 Subito regalo slugs** from `SUBITO_REGALO_CATALOG` as canonical IDs. A single `resolveCanonicalCategorySlug(listing)` consolidates resolution order: validated DB slug → source-specific mapping (Facebook stub) → title keyword inference → `null`. Filter matching (`matchesAnySubitoCategories`), display (`resolveListingCategory`), and the feed pipeline (`composeFeedListings` in `hooks/useDistanceCenter.ts`) become thin consumers.

UGC insert adds a `postCategory` field to the API payload (PostCategory enum unchanged in UI); server maps to canonical slug and persists `listing.category` at insert. Existing UGC rows without the column continue to rely on title inference at filter time (D-13 runtime-only backfill).

**Primary recommendation:** Wave 0 TDD — add `lib/listings/canonical-categories.ts` + tests, refactor `matchesSubitoCategory`/`resolveListingCategory` to delegate, extend UGC schema/route for slug persistence; planner Wave 0 updates ROADMAP/REQUIREMENTS/PROJECT.md per D-19–24.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Scope Pivot (user-directed)

- **D-01:** **No folder UI** — `/favorites` remains flat two-column `ListListingCard` grid; no folder tiles, no `/favorites/[folder]` drill-down. — **Reversibility:** reversible — UI-only; folders can be added in a future phase.
- **D-02:** **Phase 12 = canonical category mapping** — cross-source normalization infrastructure, not favorites IA. — **Reversibility:** reversible — planning artifact.
- **D-03:** **Defer FAV-01–03 to v3+ backlog** — folder grid requirements move out of active v2.0 scope; note "blocked on canonical mapping; user chose flat favorites for v2.0". — **Reversibility:** reversible — requirements traceability update.

#### Canonical Category Model

- **D-04:** **Canonical IDs = 17 Subito slugs** — `SUBITO_REGALO_CATALOG` slugs are the canonical category enum; no merged/smaller set. — **Reversibility:** costly — downstream filters, display, and future folders assume these IDs.
- **D-05:** **Primary API: `resolveCanonicalCategorySlug(listing)`** — returns canonical slug or `null`; replaces scattered logic across `subito-categories.ts`, `listing-fields.ts`, and ad-hoc inference. — **Reversibility:** costly — many call sites migrate to single resolver.
- **D-06:** **Resolution order** — (1) `listing.category` DB column if set → validate/normalize to canonical slug; (2) source-specific mapping (UGC PostCategory, future Facebook); (3) title keyword inference (`inferListingCategory`); (4) `null` (uncategorized). — **Reversibility:** reversible — logic in one module.
- **D-07:** **Keep title inference as last-resort fallback** — do not deprecate `lib/listings/categories.ts` keyword inference. — **Reversibility:** reversible.
- **D-08:** **Uncategorized filter behavior unchanged** — listings with no resolvable category excluded when specific categories selected (Phase 10 D-44); visible when no category filter active. — **Reversibility:** reversible.
- **D-09:** **Extensible source map with Facebook stub** — mapping module accepts `ListingSource`; `facebook` returns `null` until SCRP-07; architecture ready for future sources. — **Reversibility:** reversible.

#### UGC Category Persistence

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

#### Filter & Consumer Integration

- **D-14:** **FilterSheet UI unchanged** — 17 Subito category checkboxes and labels remain as today; mapping module is internal plumbing. — **Reversibility:** reversible.
- **D-15:** **Favorites UI unchanged** — no category display on favorites grid cards (Phase 11 D-13 locked). — **Reversibility:** reversible.
- **D-16:** **Mapping consumers this phase** — FilterSheet filter matching (`matchesAnySubitoCategories` refactor), `resolveListingCategory` display helper, UGC insert path; future folder/display features consume same resolver. — **Reversibility:** reversible.

#### Documentation & Module Location

- **D-17:** **Code module + CONTEXT.md summary** — e.g. `lib/listings/canonical-categories.ts` (or `lib/listings/resolve-canonical-category.ts`) with unit tests; full slug tables documented in module + CONTEXT.md. — **Reversibility:** reversible.
- **D-18:** **Subito scraped listings** — already store Subito slug in `listing.category` from scraper normalize; resolver validates slug is in catalog or maps unknown → null. — **Reversibility:** reversible.

#### Roadmap & Requirements Updates (plan-phase Wave 0)

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

### Deferred Ideas (OUT OF SCOPE)

#### Favorites Category Folders (FAV-01–03 → v3+)
- Five folder tiles (Furniture, Electronics, Home & Garden, For Kids, Other) with counts and drill-down — deferred until user opts back in; canonical mapping is prerequisite infrastructure.
- Folder tile design, drill-down navigation, folder empty states — discussion areas selected but N/A per scope pivot.

#### From REQUIREMENTS.md v3+ backlog
- **FAV-04:** Edit/reorder favorites folders — remains v3+; depends on folders returning.

#### Other deferred (out of phase)
- One-time UGC category backfill migration script
- FilterSheet merged category groups (fewer checkboxes)
- Category display on favorites grid cards
- Facebook scraper category mapping (SCRP-07) — stub only this phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAT-01 | `resolveCanonicalCategorySlug` resolves Subito, UGC, and inference paths | Single module with 4-step resolution order; consolidate 3 duplicate slug maps; `ListingSource` stub for facebook |
| CAT-02 | New UGC posts persist canonical slug in `listing.category` | Extend `CreateListingSchema` + `PostForm` JSON body with `postCategory`; map via D-11 table in API route insert |
| CAT-03 | Slug mapping tables documented and covered by unit tests | JSDoc tables in module; Wave 0 TDD colocated `canonical-categories.test.ts`; extend existing `subito-categories.test.ts` |
| I18N-01 (partial) | New strings in zh/en/it if UGC/post strings change | No new user-facing strings expected — PostForm labels unchanged (D-12); skip i18n unless API error messages added |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `resolveCanonicalCategorySlug` | Shared lib (`lib/listings/`) | — | Pure function; consumed by client filter pipeline and server insert validation |
| Canonical slug catalog / validation | Shared lib | Admin catalog import | `SUBITO_REGALO_CATALOG` is source of truth; resolver imports, does not duplicate |
| UGC PostCategory → slug at insert | API / Backend (`app/api/ugc/listings`) | Shared lib map | Trust boundary: client sends enum; server maps and writes DB column |
| Filter category matching | Browser / Client | Shared lib | `composeFeedListings` calls `matchesAnySubitoCategories` → resolver |
| Category display label | Shared lib (`lib/i18n/`) | — | `resolveListingCategory` uses resolved slug + `getSubitoCategoryLabel` |
| Subito scraper category extract | Scraper worker | — | Already writes slug via `extractCategoryFromSubitoUrl`; no Phase 12 changes |
| FilterSheet UI | Browser / Client | — | Unchanged (D-14); uses existing slug checklist |
| Title keyword inference | Shared lib | — | Stays in `categories.ts`; resolver calls as step 3 (D-07) |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.8.2 | Module + types | Project baseline [VERIFIED: package.json] |
| vitest | ^3.2.4 (registry 4.1.10) | Unit tests | Phase 10/11 Wave 0 TDD pattern [VERIFIED: package.json] |
| zod | ^4.4.3 | UGC API validation | Existing `lib/ugc/schemas.ts` [VERIFIED: package.json] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/admin/subito-regalo-catalog` | in-repo | 17 canonical slugs | Import `SUBITO_REGALO_CATALOG`, `SubitoRegaloSlug` type |
| `@/lib/listings/categories` | in-repo | Title inference | Step 3 fallback only (D-07) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New canonical module | Extend `subito-categories.ts` only | Name implies Subito-only; UGC/Facebook maps don't belong there |
| Server action for UGC insert | Existing `/api/ugc/listings` route | Route already handles auth, rate limit, zone tag — extend in place |
| DB enum migration | Code-level slug set | CONTEXT locks no schema changes; catalog validation in code |

**Installation:** None — no new packages this phase.

**Version verification:**
```bash
npm view vitest version   # 4.1.10 (project pins ^3.2.4)
npm view zod version      # 4.4.3
```

## Package Legitimacy Audit

> **N/A** — Phase 12 installs no external packages. All work uses in-repo modules and existing dependencies.

| Package | Registry | Verdict | Disposition |
|---------|----------|---------|-------------|
| — | — | — | No installs |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Project Constraints (from .cursor/rules/)

- **Stitch UI authority:** All user-facing UI MUST follow `.planning/google-stitch-ui-design/DESIGN.md` — **Phase 12 has minimal/no UI change**; FilterSheet, Favorites, PostForm labels unchanged per CONTEXT D-12, D-14, D-15.
- **Before editing UI:** Read DESIGN.md + prototype + existing components — not triggered unless PostForm wiring adds non-visible fields only.
- **Non-negotiable:** Monochrome document-first aesthetic; `@theme` tokens — no UI work expected.
- **Blocking anti-patterns:** Default shadcn themes, card shadows — N/A this phase.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LISTING DATA SOURCES                             │
├──────────────────┬──────────────────────┬─────────────────────────────────┤
│ Subito scraper   │ UGC PostForm         │ Facebook (future SCRP-07)       │
│ category slug    │ postCategory enum    │ stub → null                     │
│ in DB column     │ in API body          │                                 │
└────────┬─────────┴──────────┬───────────┴──────────────┬────────────────┘
         │                    │                          │
         ▼                    ▼                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│              lib/listings/canonical-categories.ts                       │
│  resolveCanonicalCategorySlug({ source, title, category })              │
│    1. normalize DB slug (catalog validate) → slug | continue            │
│    2. source map (facebook stub) → slug | continue                      │
│    3. inferListingCategory(title) → INFERRED_TO_SLUG → slug | continue  │
│    4. return null                                                       │
└────────┬───────────────────────────────┬───────────────────────────────┘
         │                               │
         ▼                               ▼
┌─────────────────────┐      ┌──────────────────────────────────────────┐
│ FILTER PIPELINE     │      │ DISPLAY / DETAIL                          │
│ matchesAnySubito    │      │ resolveListingCategory → getSubitoLabel   │
│ Categories          │      │ (detail ListingCard only — not grid)      │
│ composeFeedListings │      └──────────────────────────────────────────┘
│ MapExplorer         │
│ ListPageClient      │
└─────────────────────┘

UGC INSERT (write path, separate from resolver read chain):
  PostForm --postCategory--> POST /api/ugc/listings
    --> mapPostCategoryToSlug(postCategory) --> listings.category column
```

### Recommended Project Structure

```
lib/listings/
├── canonical-categories.ts      # NEW: resolver, maps, validation
├── canonical-categories.test.ts # NEW: Wave 0 TDD
├── subito-categories.ts         # REFACTOR: delegate matching to resolver
├── subito-categories.test.ts    # EXTEND: integration with resolver
├── categories.ts                # UNCHANGED: keyword inference
└── types.ts                     # ListingSource, ListingRow.category

lib/i18n/
├── listing-fields.ts            # REFACTOR: resolveListingCategory uses resolver
└── listing-fields.test.ts       # EXTEND: inference path via resolver

lib/ugc/
└── schemas.ts                   # EXTEND: postCategory enum field

app/api/ugc/listings/route.ts    # EXTEND: map + insert category slug

components/ugc/PostForm.tsx      # WIRE: send postCategory in JSON (no UI change)
```

### Pattern 1: Canonical Resolver (Wave 0 TDD)

**What:** Single exported function plus documented mapping tables.
**When to use:** Any code needing "what category is this listing?" for filter, display, or future folder grouping.

**Recommended exports** (`lib/listings/canonical-categories.ts`):

```typescript
// Source: codebase pattern + CONTEXT D-04–D-11
import { SUBITO_REGALO_CATALOG, type SubitoRegaloSlug } from '@/lib/admin/subito-regalo-catalog';
import { inferListingCategory } from './categories';
import type { ListingSource } from './types';

export type CanonicalCategoryInput = {
  source: ListingSource;
  title: string;
  category?: string | null;
};

const CATALOG_SLUGS = new Set(SUBITO_REGALO_CATALOG.map((e) => e.slug));

/** PostCategory values from PostForm — keep in sync with components/ugc/PostForm.tsx */
export type PostCategory =
  | 'furniture' | 'tech' | 'books' | 'apparel' | 'kitchenware' | 'others';

export const POST_CATEGORY_TO_SLUG: Record<PostCategory, SubitoRegaloSlug> = {
  furniture: 'arredamento-casalinghi',
  tech: 'informatica',
  books: 'libri-riviste',
  apparel: 'abbigliamento-accessori',
  kitchenware: 'arredamento-casalinghi',
  others: 'usato',
};

/** Consolidates legacySlugFromInferred + listing-fields slugMap */
export const INFERRED_CATEGORY_TO_SLUG = {
  furniture: 'arredamento-casalinghi',
  tech: 'informatica',
  apparel: 'abbigliamento-accessori',
  books: 'libri-riviste',
  home_decor: 'arredamento-casalinghi',
} as const satisfies Record<
  Exclude<import('./categories').ListingCategory, 'All'>,
  SubitoRegaloSlug
>;

export function normalizeCatalogSlug(raw: string | null | undefined): SubitoRegaloSlug | null {
  if (!raw?.trim()) return null;
  return CATALOG_SLUGS.has(raw as SubitoRegaloSlug) ? (raw as SubitoRegaloSlug) : null;
}

export function mapPostCategoryToSlug(postCategory: PostCategory): SubitoRegaloSlug {
  return POST_CATEGORY_TO_SLUG[postCategory];
}

export function resolveCanonicalCategorySlug(
  input: CanonicalCategoryInput,
): SubitoRegaloSlug | null {
  const fromDb = normalizeCatalogSlug(input.category);
  if (fromDb) return fromDb;

  if (input.source === 'facebook') return null; // SCRP-07 stub (D-09)

  const inferred = inferListingCategory(input.title);
  if (inferred) return INFERRED_CATEGORY_TO_SLUG[inferred];

  return null;
}
```

### Pattern 2: Filter Matching Delegation

**What:** Replace inline category/inference logic in `matchesSubitoCategory` with resolver.
**When to use:** All filter consumers — preserves D-44 uncategorized behavior.

```typescript
// Refactor subito-categories.ts — extend input to include source
type SubitoListingFilterInput = {
  source?: ListingSource; // default 'subito' for backward compat in tests
  title: string;
  category?: string | null;
};

export function matchesSubitoCategory(
  listing: SubitoListingFilterInput,
  selected: SubitoCategoryFilter,
): boolean {
  if (selected === 'all') return true;
  const resolved = resolveCanonicalCategorySlug({
    source: listing.source ?? 'subito',
    title: listing.title,
    category: listing.category,
  });
  return resolved === selected;
}
```

**Note:** `ListingRow` already has `source` — pass through from `composeFeedListings` and `MapExplorer`.

### Pattern 3: UGC Insert Slug Persistence

**What:** Client sends `postCategory`; server maps and writes `category` column.
**When to use:** POST `/api/ugc/listings` only — write path uses map directly, not full resolver.

```typescript
// lib/ugc/schemas.ts — extend CreateListingSchema
postCategory: z.enum(['furniture', 'tech', 'books', 'apparel', 'kitchenware', 'others']),

// app/api/ugc/listings/route.ts — insert payload
category: mapPostCategoryToSlug(parsed.data.postCategory),
```

```typescript
// PostForm.tsx — add to JSON body (no UI change)
body: JSON.stringify({
  title: title.trim(),
  photoUrl,
  lat,
  lng,
  postCategory: category,
  description: buildDescription(...),
}),
```

### Pattern 4: Display Helper Simplification

**What:** `resolveListingCategory` resolves slug first, then labels.
**When to use:** Detail page `ListingCard` (grid hides category per Phase 11 D-13).

```typescript
export function resolveListingCategory(
  row: ListingCategoryFieldRow & { source?: ListingSource },
  locale: AppLanguage,
): string | null {
  const slug = resolveCanonicalCategorySlug({
    source: row.source ?? 'subito',
    title: row.title,
    category: row.category,
  });
  if (!slug) return null;
  return getSubitoCategoryLabel(slug, locale, {
    category_en: row.category_en,
    category_zh: row.category_zh,
  });
}
```

### Anti-Patterns to Avoid

- **Duplicating slug maps:** Do not keep `legacySlugFromInferred` and `listing-fields` slugMap — single `INFERRED_CATEGORY_TO_SLUG` in canonical module.
- **Client-side slug mapping for UGC:** Map on server at insert (D-11); prevents tampered slugs.
- **Pass-through unknown DB slugs:** Per D-18, unknown slugs → `null` at step 1, then inference retry — do not treat invalid slug as canonical match.
- **FilterSheet changes:** Any visible checklist change violates D-14.
- **Bulk UGC backfill:** Out of scope (D-13); don't add migration task.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canonical slug set | Custom enum / folder buckets | `SUBITO_REGALO_CATALOG` | 17 slugs already verified in Phase 8 admin matrix |
| Title keyword inference | New ML/heuristic engine | `inferListingCategory` | Existing Italian/English keywords; D-07 locks retention |
| Category label i18n | New translation keys | `getSubitoCategoryLabel` + DB columns | Phase 10 D-31 pattern for scraped listings |
| API input validation | Manual checks | zod enum on `postCategory` | Existing schema pattern in `lib/ugc/schemas.ts` |
| Filter OR logic | New composition | `matchesAnySubitoCategories` | Phase 10 D-40 locked |

**Key insight:** Category resolution is deceptively simple but already duplicated in three places — consolidation prevents drift when folder UI returns in v3+.

## Common Pitfalls

### Pitfall 1: Unknown Slug in DB Breaks Filters

**What goes wrong:** Scraper stores non-catalog slug (typo, Subito URL change); listing has `category` set but never matches FilterSheet selections; inference skipped.
**Why it happens:** Current `matchesSubitoCategory` compares raw `listing.category === selected` without catalog validation.
**How to avoid:** `normalizeCatalogSlug` returns `null` for unknown slugs; resolver falls through to inference (D-18). Document this in tests.
**Warning signs:** Subito listing with valid title keywords fails category filter despite descriptive title.

### Pitfall 2: Existing UGC Rows Stay Uncategorized for Filter

**What goes wrong:** Pre-Phase-12 UGC has `category: null`; users filter by category and old posts disappear unless title matches keywords.
**Why it happens:** D-13 runtime-only backfill — no migration.
**How to avoid:** Accept as known behavior; inference still helps for keyword-rich titles. Optional future backfill script explicitly deferred.
**Warning signs:** UGC posts with generic titles ("Free stuff") excluded from all category filters.

### Pitfall 3: PostCategory Type Drift

**What goes wrong:** `PostCategory` defined separately in PostForm and canonical module get out of sync.
**Why it happens:** PostForm currently uses local `type PostCategory`.
**How to avoid:** Export `PostCategory` from canonical module (or `lib/ugc/types.ts`); import in PostForm and zod schema.
**Warning signs:** TypeScript compile error or runtime zod 400 on post.

### Pitfall 4: Missing `source` in Filter Input

**What goes wrong:** Resolver can't apply Facebook stub or future source maps; tests pass with defaults but production edge cases wrong.
**Why it happens:** `SubitoListingFilterInput` today only has `title` + `category`.
**How to avoid:** Pass `listing.source` from `ListingRow` in all filter call sites.
**Warning signs:** Facebook listings (when added) always uncategorized even with category column.

### Pitfall 5: Breaking Phase 10 Filter Regression Tests

**What goes wrong:** Refactored matching changes D-44 uncategorized semantics.
**Why it happens:** Over-eager resolver treats empty string category as valid.
**How to avoid:** Run `subito-categories.test.ts` + `useDistanceCenter.test.ts` after refactor; preserve empty-selection passes all.
**Warning signs:** `matchesAnySubitoCategories(uncategorized, [])` returns false.

## Code Examples

### Resolution Order Test Cases (Wave 0)

```typescript
// lib/listings/canonical-categories.test.ts
import { describe, expect, it } from 'vitest';
import {
  mapPostCategoryToSlug,
  normalizeCatalogSlug,
  resolveCanonicalCategorySlug,
} from './canonical-categories';

describe('normalizeCatalogSlug', () => {
  it('accepts catalog slugs', () => {
    expect(normalizeCatalogSlug('informatica')).toBe('informatica');
  });
  it('rejects unknown slugs (D-18)', () => {
    expect(normalizeCatalogSlug('not-a-real-slug')).toBeNull();
  });
});

describe('resolveCanonicalCategorySlug', () => {
  it('prefers valid DB slug over title inference (CAT-01)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'subito',
        title: 'Divano',
        category: 'informatica',
      }),
    ).toBe('informatica');
  });

  it('falls back to inference when category null (CAT-01)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'ugc',
        title: 'Monitor 24 pollici',
        category: null,
      }),
    ).toBe('informatica');
  });

  it('returns null for facebook stub (D-09)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'facebook',
        title: 'Chair',
        category: null,
      }),
    ).toBeNull();
  });

  it('retries inference when DB slug unknown (D-18)', () => {
    expect(
      resolveCanonicalCategorySlug({
        source: 'subito',
        title: 'Monitor 24 pollici',
        category: 'bogus-slug',
      }),
    ).toBe('informatica');
  });
});

describe('mapPostCategoryToSlug', () => {
  it('maps all six PostCategory values (D-11)', () => {
    expect(mapPostCategoryToSlug('kitchenware')).toBe('arredamento-casalinghi');
    expect(mapPostCategoryToSlug('others')).toBe('usato');
  });
});
```

### Existing Test Pattern Reference (Phase 10)

```typescript
// lib/listings/subito-categories.test.ts — preserve these behaviors after refactor
expect(matchesAnySubitoCategories(uncategorizedListing, [])).toBe(true); // D-44
expect(matchesAnySubitoCategories(uncategorizedListing, ['informatica'])).toBe(false); // D-44
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| UGC category in description only | Persist `listing.category` slug | Phase 12 | Filters/display work without parsing description |
| 3 duplicate slug maps | Single `INFERRED_CATEGORY_TO_SLUG` + `POST_CATEGORY_TO_SLUG` | Phase 12 | One place to update for v3+ folders |
| Raw DB slug string compare | Catalog-validated resolver | Phase 12 | Unknown slugs don't block inference fallback |
| FAV-01–03 folder UI in Phase 12 | Canonical mapping infra only | 2026-08-10 discuss pivot | ROADMAP/REQUIREMENTS Wave 0 update required |

**Deprecated/outdated:**
- `legacySlugFromInferred` private function in `subito-categories.ts` — replace with canonical module import.
- Duplicate `slugMap` in `listing-fields.ts` — remove after resolver integration.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Unknown DB slugs should fall through to inference (not hard-null entire resolution) | Pattern 1 | Listings with bad slug + generic title become permanently uncategorized |
| A2 | Export `PostCategory` from canonical module and import in PostForm | Pattern 3 | Type drift between form and API |
| A3 | `ListingCard` / detail queries include `source` field for resolver | Pattern 4 | Display inference wrong for UGC vs Subito edge cases |
| A4 | No new i18n keys needed (D-12 UI unchanged) | Phase Requirements | Low — only if new API error strings added |

## Open Questions (RESOLVED)

1. **Unknown slug: stop or continue chain?** — **RESOLVED:** Continue chain. Invalid DB slug skips to title inference (not terminal null). Test in `canonical-categories.test.ts` per D-18.

2. **Shared PostCategory type location** — **RESOLVED:** Export `PostCategory` and `POST_CATEGORY_TO_SLUG` from `lib/listings/canonical-categories.ts`; PostForm and zod schema import from there.

3. **MapExplorer / ListPageClient refactor scope** — **RESOLVED:** Out of scope. Pass `source` only when touching filter inputs in Plan 02; MapExplorer unchanged this phase (D-16).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vitest, Next.js | ✓ | v23.10.0 | — |
| vitest | Wave 0 TDD | ✓ | ^3.2.4 (lockfile) | — |
| zod | UGC schema | ✓ | ^4.4.3 | — |
| Supabase | UGC insert integration | ✓ | local/cloud | Manual API test at phase gate |

**Missing dependencies with no fallback:** none

**Missing dependencies with fallback:** none

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^3.2.4 [VERIFIED: package.json] |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test:lib -- lib/listings/canonical-categories.test.ts` |
| Full suite command | `npm run test:lib` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAT-01 | Resolver: DB slug, inference, facebook stub, unknown slug | unit | `npm run test:lib -- lib/listings/canonical-categories.test.ts -x` | ❌ Wave 0 |
| CAT-01 | Filter matching delegates correctly | unit | `npm run test:lib -- lib/listings/subito-categories.test.ts -x` | ✅ extend |
| CAT-01 | Feed pipeline OR filter unchanged | unit | `npm run test:lib -- hooks/useDistanceCenter.test.ts -x` | ✅ |
| CAT-02 | PostCategory map completeness | unit | `npm run test:lib -- lib/listings/canonical-categories.test.ts -x` | ❌ Wave 0 |
| CAT-02 | UGC route persists category | integration | Manual / optional route test | ❌ optional |
| CAT-03 | Display helper uses resolver | unit | `npm run test:lib -- lib/i18n/listing-fields.test.ts -x` | ✅ extend |
| CAT-03 | Mapping tables documented | manual | JSDoc + module header review | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:lib -- lib/listings/canonical-categories.test.ts -x`
- **Per wave merge:** `npm run test:lib`
- **Phase gate:** Full lib suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `lib/listings/canonical-categories.ts` — resolver + maps
- [ ] `lib/listings/canonical-categories.test.ts` — CAT-01/02/03 coverage
- [ ] ROADMAP.md Phase 12 rename + success criteria (D-19, D-22)
- [ ] REQUIREMENTS.md CAT-01–03 add + FAV-01–03 defer (D-20, D-21)
- [ ] PROJECT.md goal #4 update (D-24)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `requireAuth` on UGC route — unchanged |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | zod `postCategory` enum; slug from server map only — never accept raw slug from client |
| V6 Cryptography | no | — |

### Known Threat Patterns for Next.js API + zod

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client sends arbitrary category slug | Tampering | Accept `postCategory` enum only; server maps to catalog slug |
| Invalid enum bypass | Tampering | zod `.safeParse` → 400 (existing pattern in route) |
| XSS via category in description | Spoofing | Unchanged — description already user content; category is server-controlled slug |

## Sources

### Primary (HIGH confidence)

- Codebase grep/read — `lib/listings/subito-categories.ts`, `lib/i18n/listing-fields.ts`, `components/ugc/PostForm.tsx`, `app/api/ugc/listings/route.ts`, `scraper/src/shared/normalize.ts` [VERIFIED: codebase]
- `.planning/phases/12-canonical-category-mapping/12-CONTEXT.md` — locked decisions D-01–D-24
- `.planning/phases/10-search-filter-sheet-distance/10-RESEARCH.md` — Wave 0 TDD pattern
- `package.json` / `vitest.config.ts` — test infrastructure [VERIFIED: package.json]

### Secondary (MEDIUM confidence)

- `.planning/phases/10-search-filter-sheet-distance/10-CONTEXT.md` — D-40, D-44 category filter semantics

### Tertiary (LOW confidence)

- None — no unverified external library claims

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing vitest/zod patterns verified in repo
- Architecture: HIGH — codebase touchpoints read; resolution order locked in CONTEXT
- Pitfalls: HIGH — derived from current implementation gaps (UGC null category, unvalidated slugs)

**Research date:** 2026-08-10
**Valid until:** 2026-09-10 (stable lib refactor; catalog slugs change rarely)
