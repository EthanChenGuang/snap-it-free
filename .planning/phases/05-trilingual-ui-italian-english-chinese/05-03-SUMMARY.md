---
phase: 05-trilingual-ui-italian-english-chinese
plan: 03
subsystem: i18n
tags: [i18n, listing-fields, key-parity, metadata, vitest]

requires:
  - phase: 05-01
    provides: useMessages hook, message catalogs, browser locale seeding
provides:
  - resolveListingTitle / resolveListingDescription helpers (D-133)
  - Listing card/detail locale bridge for Phase 6 translation columns
  - Message catalog key-parity test gate (D-138)
  - SSR metadata from zh catalog app.description
affects: [05-02, Phase 6 auto-translate ingest]

tech-stack:
  added: []
  patterns:
    - "ListingFieldRow optional title_en/zh columns with Italian fallback"
    - "key-parity.test.ts deep-compares nested catalog key paths"

key-files:
  created:
    - lib/i18n/listing-fields.ts
    - lib/i18n/listing-fields.test.ts
    - messages/key-parity.test.ts
  modified:
    - lib/listings/types.ts
    - components/listings/ListingCard.tsx
    - components/listings/ListListingCard.tsx
    - components/detail/HeroMetadata.tsx
    - components/detail/DetailArticle.tsx
    - components/detail/ScrapedListingShell.tsx
    - components/detail/UgcListingShell.tsx
    - messages/zh.ts
    - messages/en.ts
    - messages/it.ts
    - app/layout.tsx

key-decisions:
  - "Queries unchanged — title_en/zh SELECT deferred until Phase 6 migration exists"
  - "SSR metadata uses getMessages('zh') per D-131 Chinese default policy"

requirements-completed: [I18N-02]

coverage:
  - id: D133
    description: resolveListingTitle returns title_en/zh by locale with Italian fallback
    requirement: I18N-02
    verification:
      - kind: unit
        ref: "lib/i18n/listing-fields.test.ts"
        status: pass
    human_judgment: false
  - id: D138
    description: zh/en/it catalogs share identical nested key paths
    requirement: I18N-02
    verification:
      - kind: unit
        ref: "messages/key-parity.test.ts"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-08-04
status: complete
---

# Phase 5 Plan 03: Listing Field Resolver + I18N-02 Audit Summary

**Locale-aware listing title/description resolver with card/detail wiring, catalog key-parity gate, and zh-sourced SSR metadata**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-04T18:03:00Z
- **Completed:** 2026-08-04T18:07:00Z
- **Tasks:** 3/3
- **Files modified:** 14

## Accomplishments

- Created `resolveListingTitle` and `resolveListingDescription` with 12 unit tests covering en/zh/it fallbacks and UGC behavior (D-133, D-134)
- Wired ListingCard, ListListingCard, HeroMetadata, and DetailArticle to resolver via `useMessages().language`
- Added `messages/key-parity.test.ts` structural parity gate across zh/en/it catalogs
- Added `app.description` to all catalogs; root layout metadata now sourced from `getMessages('zh')` (D-131)
- Ripgrep audit found no hardcoded English stragglers in `components/` or `app/`

## Task Commits

Each task was committed atomically:

1. **Task 1: Listing field resolver + unit tests** - `5c9cbb2` (test), `49e2b86` (feat)
2. **Task 2: Wire listing cards/detail to resolver** - `6e90304` (feat)
3. **Task 3: I18N-02 audit — key parity + metadata** - `133ac50` (test), `f17ed8e` (feat)

## Decisions Made

- Kept `lib/listings/queries.ts` SELECT unchanged — Phase 6 migration columns (`title_en`, `title_zh`) not yet in schema; resolver falls back to original title until columns exist
- DetailArticle now accepts `listing` prop instead of raw `description` string for locale resolution

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest `it` import shadowing**
- **Found during:** Task 3
- **Issue:** `import { messages as it }` shadowed vitest's `it()` test function
- **Fix:** Renamed import to `itCatalog`
- **Files modified:** `messages/key-parity.test.ts`
- **Commit:** `133ac50`

None other — plan executed as written.

## Issues Encountered

- `npm run build` fails on pre-existing TypeScript error in `scraper-admin/src/components/Sidebar.tsx:155` (unrelated). `npx vitest run lib/i18n/ messages/key-parity.test.ts` passes (26 tests).

## Audit Notes

- Ripgrep `"[A-Z][a-z]+ [a-z]+"` on `components/` and `app/*.tsx` returned zero matches — no stragglers deferred
- Map popup, DM drawer, and search filters still use raw `listing.title` for filtering/inference — intentional (search matches original Italian text; out of plan scope)

## User Setup Required

None.

## Next Phase Readiness

- Phase 6 migration can extend SELECT queries with `title_en, title_zh` — resolver and types already support optional columns
- Manual UAT: inject mock `title_en` in DB, switch to English, verify card title updates

## Self-Check: PASSED

- FOUND: lib/i18n/listing-fields.ts
- FOUND: lib/i18n/listing-fields.test.ts
- FOUND: messages/key-parity.test.ts
- FOUND: 5c9cbb2, 49e2b86, 6e90304, 133ac50, f17ed8e

---
*Phase: 05-trilingual-ui-italian-english-chinese*
*Completed: 2026-08-04*
