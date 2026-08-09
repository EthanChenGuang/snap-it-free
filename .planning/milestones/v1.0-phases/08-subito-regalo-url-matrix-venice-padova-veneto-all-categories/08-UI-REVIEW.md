# Phase 08 — UI Review

**Audited:** 2026-08-09  
**Baseline:** `08-UI-SPEC.md` (Stitch phase08 structured-minimalist contract)  
**Screenshots:** Partial — Elenco desktop captured; admin matrix + map category panel verified via Playwright automation during Phase 8 UAT (`scripts/phase8-uat-automation.mjs`)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Italian category labels + zh admin chrome match contract; Elenco missing `Categoria` row label |
| 2. Visuals | 3/4 | Strong chip/badge hierarchy; map category row hidden until header Search toggle |
| 3. Color | 3/4 | Monochrome Stitch tokens dominate; spec-documented `#f1f1f0` badge fill used correctly |
| 4. Typography | 2/4 | Contract cap violated by `font-bold` + `text-[10px]` badges and pervasive arbitrary `text-[14px]` |
| 5. Spacing | 3/4 | `space-*` / `gutter` tokens used; chip `py-1.5` and image hover scale are minor drift |
| 6. Experience Design | 3/4 | Seed confirm + empty states solid; map filter discoverability requires extra tap |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **Normalize listing badge typography to the 4-size / 2-weight contract** — `ListListingCard.tsx:76`, `ListingCard.tsx:75,111` use `text-[10px] font-bold` and `font-bold` on price chips. UI-SPEC forbids weight 700 and caps sizes at Display/Heading/Body/Label. Replace with `text-label-sm font-semibold` (14px / 600) and drop the 10px micro-size; badges stay visually dense via uppercase + tracking.

2. **Add `Categoria` row label on Elenco** — `ListPageClient.tsx:62-65` renders `SubitoCategoryFilterChips` inline without the row label Screen 4 requires (`Categoria` — `font-label-sm uppercase tracking-wide`). Map panel (`SubitoCategoryFilterChips` `variant="panel"`) includes the label; Elenco should mirror Screen 3/4 parity for filter scanability.

3. **Improve map category filter discoverability** — `MapExplorer.tsx:99-108` only mounts `FloatingMapSearch` (zone + category rows) when `useMapSearchOpen()` is true. Prototype shows filters in the persistent floating stack. Default search open on `/` first visit, or always show zone+category rows while collapsing only the text input, would match UI-SPEC intent and reduce operator/consumer friction.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**PASS — locale split per contract**

- Admin matrix uses Chinese chrome exactly as UI-SPEC §Screen 1: `Regalo URL 矩阵`, `生成 URL`, `应用推荐种子`, `保留当前 URL` (`RegaloUrlMatrix.tsx:79-171`, `ReplaceUrlsConfirmDialog.tsx:56`).
- 17 Italian category checkbox labels match catalog table (`subito-regalo-catalog.ts` → `RegaloUrlMatrix.tsx:129-148`).
- Consumer chips use Italian via `getSubitoCategoryLabel` (D-30/D-31); i18n empty states wired in `ListPageClient.tsx:78-84`.

**PASS — modal copy**

- Seed overwrite dialog matches prototype: title `Replace target URLs?`, dynamic 34-URL body, dismiss `保留当前 URL`, confirm `Replace URLs` (`ReplaceUrlsConfirmDialog.tsx:41-66`).

**WARNING — Elenco filter label missing**

- UI-SPEC Screen 4: "implement with Italian **`Categoria`** row label to align with Screen 3." `ListPageClient` renders chips only — no uppercase row label above the scroll row.

**WARNING — intentional English in matrix meta (spec-aligned)**

- URL preview and ≥30 warning use English strings per UI-SPEC table (`RegaloUrlMatrix.tsx:155-183`). Not a defect, but operators see zh section titles adjacent to English meta lines.

### Pillar 2: Visuals (3/4)

**PASS — hierarchy and icon system**

- Admin matrix inserted above textarea inside bordered form container (D-01); inner panel uses `surface-container-low` + thin border (`RegaloUrlMatrix.tsx:85-152`).
- Material Symbols for warning/info icons; no lucide imports in Phase 8 components.
- Category chips use clear selected/unselected contrast via `chipActive` / `chip` button variants (`button.tsx:15-16`).

**PASS — consumer card metadata**

- Map drawer cards show zone uppercase OR city uppercase + category badge with Venice vs Padova styling split (`ListingCard.tsx:88-104`).
- Elenco cards show image overlay badge + `location_on` line (`ListListingCard.tsx:73-105`).

**WARNING — map filters not visible by default**

- Prototype `consumer_map_category_filters/code.html` shows zone + category rows in the floating stack at all times. Implementation gates the entire `FloatingMapSearch` behind header Search toggle (`MapExplorer.tsx:99-108`, `Header.tsx:40-47`). Category filters exist but require discovery.

**PASS — frosted panel when search open**

- `SubitoCategoryFilterChips` `variant="panel"` uses `rounded-xl border bg-surface/80 backdrop-blur-md` + scroll fade mask — matches documented Stitch exception (`SubitoCategoryFilterChips.tsx:61-68`).

### Pillar 3: Color (3/4)

**PASS — 60/30/10 monochrome**

- Page/surface backgrounds dominate; chips use `surface-container-high` when inactive; primary black reserved for CTAs and selected chips.
- Modal overlay uses Radix dialog with `shadow-none` and outline borders — no marketing drop shadows.

**PASS — spec-allowed hex**

| File | Usage | Verdict |
|------|-------|---------|
| `RegaloUrlMatrix.tsx:177` | `bg-[#f1f1f0] text-amber-700` warning | ✓ UI-SPEC §Screen 1 warning state |
| `ListingCard.tsx:98` | Venice category badge `#f1f1f0` | ✓ UI-SPEC §Screen 3 |
| `ListListingCard.tsx:78` | Venice overlay badge `#f1f1f0` | ✓ UI-SPEC §Screen 4 |

**WARNING — `font-medium` vs semibold on chip buttons**

- `button.tsx:7` base uses `font-medium` (500) while contract caps at 400/600. Minor weight drift on 18 chips; consider `font-semibold` for active chip only.

### Pillar 4: Typography (2/4)

**PASS — Inter semantic tokens in places**

- Map location lines use `text-label-sm uppercase tracking-widest` (`ListingCard.tsx:89`).
- Modal title at 24px/semibold aligns with Heading role (`ReplaceUrlsConfirmDialog.tsx:41`).

**BLOCKER-adjacent — weight 700 usage**

| File | Line | Pattern |
|------|------|---------|
| `ListListingCard.tsx` | 76, 92 | `font-bold` on badge + Free price |
| `ListingCard.tsx` | 75, 111 | `font-bold` on source badge + Free price |

UI-SPEC §Typography: "weights **400** and **600** only — do not introduce weight 700."

**WARNING — sixth de facto font size (10px / 17px)**

- Badge overlays: `text-[10px]` (`ListListingCard.tsx:76`, `ListingCard.tsx:75`) — below Label floor; map to `text-label-sm` with uppercase.
- Card titles: `text-body-lg` (17px in `globals.css:57`) — fifth size outside 40/24/15/14 contract; UI-SPEC Body is 15px (`text-body-md`).

**WARNING — arbitrary px sizes in admin matrix**

- `RegaloUrlMatrix.tsx` uses ~15× `text-[14px]` / `text-[15px]` instead of `text-label-md` / `text-body-md` tokens. Same pattern inherited from Phase 6 `SourceDetailClient.tsx` — consistent but not token-clean.

### Pillar 5: Spacing (3/4)

**PASS — grid rhythm**

- Matrix inner panel `p-4` (16px), section gaps `space-y-4`, category grid `gap-x-4 gap-y-1` — 4px grid respected.
- Map floating stack `gap-space-md`, `px-gutter`, `max-w-2xl` per UI-SPEC.

**WARNING — chip vertical padding**

- `SubitoCategoryFilterChips.tsx:49` uses `py-1.5` (6px) — off strict 4px multiples; UI-SPEC documents `py-1` (4px) badge exception. Align chips to `py-1` or `py-space-xs`.

**WARNING — decorative motion**

- `group-hover:scale-105` on listing images (`ListListingCard.tsx:65`, `ListingCard.tsx:65`) — subtle; acceptable but not in Stitch static prototypes.

### Pillar 6: Experience Design (3/4)

**PASS — destructive action guard**

- Recommended seed overwrite opens confirm modal when textarea non-empty; overlay/Escape/`保留当前 URL` cancel without mutation (verified in UAT automation).

**PASS — empty + loading states**

| Surface | Evidence |
|---------|----------|
| Elenco empty | `ListPageClient.tsx:74-84` — icon + title + description from i18n |
| Elenco refresh | `isRefreshing` branch shows refreshing copy |
| Map empty | `MapExplorer.tsx:110-116` — no listings banner |
| Filter empty | Category + search combine to zero results → empty block |

**PASS — combined filters**

- `MapExplorer.tsx:40-48` applies zone AND category AND search query in pipeline.

**WARNING — map category UX gate**

- Users landing on `/` see map + drawer but not category chips until Search tap. Combined zone+category filtering works once open, but default path hides Phase 8's primary new control.

**WARNING — Elenco lacks zone row**

- UI-SPEC Screen 4 notes zone row as optional; implementation filters category only on `/list` (no zone chips). Acceptable MVP simplification — document if intentional.

---

## Registry Safety

Skipped — `shadcn_initialized: false` in `08-UI-SPEC.md`; Phase 8 uses existing Radix dialog primitives restyled to Stitch tokens, no new third-party registry blocks.

---

## Screenshots

| File | Description |
|------|-------------|
| `.planning/ui-reviews/08-elenco-desktop.png` | `/list` — 18 category chips, Tutte selected, Padova location labels on cards |
| Phase 8 UAT automation | `/admin/sources/subito` matrix + seed modal; map Categoria panel after Search toggle |

---

## Files Audited

- `components/admin/RegaloUrlMatrix.tsx`
- `components/admin/ReplaceUrlsConfirmDialog.tsx`
- `components/admin/SourceDetailClient.tsx`
- `components/listings/SubitoCategoryFilterChips.tsx`
- `components/listings/ListPageClient.tsx`
- `components/listings/ListListingCard.tsx`
- `components/listings/ListingCard.tsx`
- `components/map/FloatingMapSearch.tsx`
- `components/map/MapExplorer.tsx`
- `components/ui/button.tsx`
- `components/ui/dialog.tsx`
- `lib/admin/subito-regalo-catalog.ts`
- `lib/listings/subito-categories.ts`
- `app/globals.css`
- `.planning/phases/08-subito-regalo-url-matrix-venice-padova-veneto-all-categories/08-UI-SPEC.md`
- `.planning/google-stitch-ui-design/phase08/structured_minimalist/DESIGN.md`
