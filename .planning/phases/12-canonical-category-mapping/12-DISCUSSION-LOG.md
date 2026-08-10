# Phase 12: Canonical Category Mapping - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 12-Canonical Category Mapping (renamed from Favorites Category Folders)
**Areas discussed:** Subito slug mapping, scope pivot, roadmap/requirements update

---

## Subito Slug → Folder Mapping (pivoted)

| Option | Description | Selected |
|--------|-------------|----------|
| Preset sensible grouping into 5 folders | Map 17 Subito slugs → Furniture/Electronics/Home & Garden/For Kids/Other | |
| Remove folders — unified flat list | No category folders; all favorites in single grid | ✓ |
| Code module + CONTEXT.md | Mapping documented in lib + CONTEXT | ✓ |

**User's choice:** Remove all folders from favorites; save everything into a single unified list. Define cross-source mapping (Subito, UGC, others) instead of folder UI.

**Notes:** User also selected mapping doc location as code_plus_context. UGC should participate in same mapping architecture as scraped Subito listings.

---

## Scope Pivot Confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Drop folder UI — mapping only | Favorites stays flat 2-col grid; Phase 12 = canonical category mapping | ✓ |
| Folders later | Defer folders to future phase after mapping exists | ✓ (implicit via defer FAV-01–03) |

**User's choice:** Drop folder UI; Phase 12 focuses on unified category mapping only.

---

## Canonical Category Model

| Option | Description | Selected |
|--------|-------------|----------|
| 17 Subito slugs as canonical IDs | Canonical enum = SUBITO_REGALO_CATALOG slugs | ✓ |
| Write listing.category on UGC post | Map PostCategory → slug at insert; stop description-only storage | ✓ |
| FilterSheet UI unchanged | 17 Subito labels in filter; mapping is internal | ✓ |
| Keep title inference fallback | category column → source map → keywords → null | ✓ |

**User's choice:** All recommended options above.

---

## UGC PostCategory → Slug Map

| Option | Description | Selected |
|--------|-------------|----------|
| Sensible preset | furniture→arredamento-casalinghi, tech→informatica, books→libri-riviste, apparel→abbigliamento-accessori, kitchenware→arredamento-casalinghi, others→usato | ✓ |
| Runtime-only backfill | New posts write category; no bulk migration | ✓ |
| Exclude uncategorized when filtering | Matches Phase 10 D-44 | ✓ |

**User's choice:** Preset map + runtime-only backfill.

---

## API & Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| resolveCanonicalCategorySlug(listing) | Single primary resolver API | ✓ |
| Facebook source stub | Extensible source map; facebook → null until SCRP-07 | ✓ |
| Defer FAV-01–03 to v3+ | Folder requirements leave active v2.0 scope | ✓ |

**User's choice:** Single resolver + facebook stub + defer folder requirements.

---

## Roadmap & Requirements Update

| Option | Description | Selected |
|--------|-------------|----------|
| Rename phase to Canonical Category Mapping | Slug: 12-canonical-category-mapping | ✓ |
| FAV-01–03 → v3+ deferred | Not cancelled; backlog with mapping prerequisite note | ✓ |
| Add CAT-01–03 requirements | Resolver, UGC persist, documented + tested | ✓ |
| Mapping success criteria | Resolver + UGC persist + tests + FilterSheet unchanged | ✓ |
| Planner updates docs in plan-phase Wave 0 | ROADMAP, REQUIREMENTS, PROJECT.md | ✓ |
| Update PROJECT.md goal #4 | Category folders → canonical mapping | ✓ |

**User's choice:** All recommended options.

---

## Folder Areas (N/A)

**Folder tile design, drill-down navigation, empty states** — user selected these initially but scope pivot made them not applicable. Captured as deferred in CONTEXT.md (FAV-01–03 v3+).

---

## Claude's Discretion

- Module filename, test coverage depth, unknown slug normalization
- Refactor scope for subito-categories vs listing-fields delegation

## Deferred Ideas

- Favorites category folder grid (FAV-01–03) — v3+ after user opted for flat list
- One-time UGC backfill migration
- FilterSheet merged category groups
- Category on favorites grid cards
