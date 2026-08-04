---
phase: 05-trilingual-ui-italian-english-chinese
plan: 01
subsystem: ui
tags: [i18n, radix, vitest, stitch, header, localStorage]

requires:
  - phase: quick/260804-hed
    provides: Message catalogs, useMessages hook, Settings LanguageSection, zh default
provides:
  - Shared LANGUAGES constant for Header + Settings
  - Browser locale first-visit seeding in preferences
  - Stitch-aligned HeaderLanguageDropdown on all Header pages
  - I18N doc alignment (Chinese default, browser-detect note)
affects: [05-02, 05-03, I18N-01 verification]

tech-stack:
  added: ["@radix-ui/react-dropdown-menu"]
  patterns:
    - "Shared lib/i18n/languages.ts consumed by Settings + Header"
    - "First-visit seed via writeAppPreferences in syncSnapshotFromStorage"
    - "Radix DropdownMenu restyled with Stitch @theme tokens"

key-files:
  created:
    - lib/i18n/languages.ts
    - lib/i18n/detect-browser-language.ts
    - lib/i18n/detect-browser-language.test.ts
    - lib/settings/preferences.test.ts
    - components/shell/HeaderLanguageDropdown.tsx
  modified:
    - lib/settings/preferences.ts
    - components/settings/LanguageSection.tsx
    - components/shell/Header.tsx
    - messages/zh.ts
    - messages/en.ts
    - messages/it.ts
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - package.json

key-decisions:
  - "Seeding guard (seedingFirstVisit) prevents writeAppPreferences recursion on first read"
  - "Radix DropdownMenu over custom popover — matches D-53 Stitch + Radix pattern"

patterns-established:
  - "Header and Settings both call writeAppPreferences({ language }) — instant sync via useMessages"
  - "detectBrowserLanguage: zh/it/en prefix match, zh fallback for unsupported locales"

requirements-completed: []

coverage:
  - id: D1
    description: Shared LANGUAGES constant extracted; LanguageSection imports from lib/i18n/languages
    requirement: I18N-01
    verification:
      - kind: unit
        ref: "lib/i18n/detect-browser-language.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: Browser first-visit seeds language from detectBrowserLanguage when localStorage key absent
    requirement: I18N-01
    verification:
      - kind: unit
        ref: "lib/settings/preferences.test.ts#seeds language from detectBrowserLanguage"
        status: pass
    human_judgment: false
  - id: D3
    description: Header language dropdown with native-script closed label and 44px touch targets
    requirement: I18N-01
    verification: []
    human_judgment: true
    rationale: Visual Stitch parity and header↔Settings sync require manual UI verification on map/settings pages
  - id: D4
    description: ROADMAP and REQUIREMENTS document Chinese default with browser-detect on first visit
    requirement: I18N-01
    verification:
      - kind: other
        ref: "grep Chinese (default) .planning/ROADMAP.md .planning/REQUIREMENTS.md"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-04
status: complete
---

# Phase 5 Plan 01: Header Language Dropdown + Browser First-Visit Summary

**Stitch header language dropdown with shared LANGUAGES, browser locale seeding on first visit, and Chinese-default doc alignment**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-04T18:01:00Z
- **Completed:** 2026-08-04T18:03:00Z
- **Tasks:** 4/4
- **Files modified:** 13

## Accomplishments

- Extracted `LANGUAGES` to `lib/i18n/languages.ts` and `detectBrowserLanguage()` with unit tests (zh-CN, it-IT, en-US, fr-FR→zh)
- First visit with no `shoumanwu_app_preferences` localStorage key seeds language from browser; existing saved prefs never re-detected
- Added `HeaderLanguageDropdown` (Radix + Stitch tokens) to Header right cluster — closed label shows 中文 / English / Italiano
- Updated ROADMAP Phase 5 and REQUIREMENTS I18N-01 to Chinese (default) with browser-detect note

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract shared LANGUAGES + browser detect helper with tests** - `fedb5fe` (feat)
2. **Task 2: Browser first-visit detect in preferences** - `940051d` (feat)
3. **Task 3: Header language dropdown — Stitch UI** - `8a2d36d` (feat)
4. **Task 4: Document alignment — Chinese default** - `50cefe7` (docs)

## Files Created/Modified

- `lib/i18n/languages.ts` — shared zh/en/it labels for Header + Settings
- `lib/i18n/detect-browser-language.ts` — navigator.language → AppLanguage mapper
- `lib/settings/preferences.ts` — first-visit seeding with recursion guard
- `components/shell/HeaderLanguageDropdown.tsx` — Stitch dropdown, writeAppPreferences on select
- `components/shell/Header.tsx` — language dropdown + search in right cluster
- `messages/{zh,en,it}.ts` — `header.language`, `header.languageMenu` aria keys

## Decisions Made

- Used `seedingFirstVisit` flag so `writeAppPreferences` during first read uses `DEFAULT_PREFERENCES` as base without recursive `readAppPreferences`
- Installed `@radix-ui/react-dropdown-menu` for D-53 Radix primitive pattern (restyled, no shadcn default theme)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run build` fails on pre-existing TypeScript error in `scraper-admin/src/components/Sidebar.tsx:155` (unrelated to this plan). `npx vitest run lib/i18n/` passes (11 tests).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 05-02-PLAN.md (server locale storage + push notification locale)
- Manual UAT recommended: switch language from header on map page, verify Settings segment sync, clear localStorage with browser set to it-IT

## Self-Check: PASSED

- FOUND: lib/i18n/languages.ts
- FOUND: lib/i18n/detect-browser-language.ts
- FOUND: components/shell/HeaderLanguageDropdown.tsx
- FOUND: fedb5fe, 940051d, 8a2d36d, 50cefe7

---
*Phase: 05-trilingual-ui-italian-english-chinese*
*Completed: 2026-08-04*
