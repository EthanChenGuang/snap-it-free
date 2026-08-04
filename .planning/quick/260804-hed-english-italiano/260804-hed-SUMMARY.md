---
quick_id: 260804-hed
slug: english-italiano
subsystem: i18n
tags: [i18n, messages, preferences, zh, en, it]
requires: []
provides:
  - Multi-locale message catalogs (zh/en/it)
  - getMessages resolver with zh default/fallback
  - useMessages client hook bound to app preferences
  - Document lang sync from language preference
affects: [settings, shell, listings, map, detail, ugc, api]
tech-stack:
  added: []
  patterns:
    - Lightweight catalogs in messages/*.ts without next-intl
    - Client UI via useMessages(); server/API via getMessages('zh')
key-files:
  created:
    - messages/zh.ts
    - messages/en.ts
    - messages/index.ts
    - lib/i18n/useMessages.ts
    - lib/i18n/get-messages.test.ts
    - components/shell/DocumentLang.tsx
  modified:
    - messages/it.ts
    - lib/settings/preferences.ts
    - components/settings/LanguageSection.tsx
    - components/shell/BottomNav.tsx
    - components/**/*.tsx (client message imports)
    - app/layout.tsx
    - app/manifest.ts
    - app/api/**/*.ts
    - lib/alerts/process-events.ts
key-decisions:
  - "D-QL-02: Default language is zh (not it)"
  - "D-QL-03: Custom catalogs + preference resolver — no next-intl"
  - "D-QL-04: Server/API/push always getMessages('zh') because prefs are localStorage-only"
  - "D-QL-05: Removed languageNote UI; key kept empty for catalog shape"
patterns-established:
  - "Client components call useMessages() inside the component — never bake messages.* at module scope"
  - "dynamic() loading fallbacks may use getMessages('zh') when hooks are unavailable"
requirements-completed: []
coverage:
  - id: D1
    description: getMessages returns zh/en/it catalogs with zh fallback
    verification:
      - kind: unit
        ref: lib/i18n/get-messages.test.ts
        status: pass
    human_judgment: false
  - id: D2
    description: Client UI switches language via Settings preference without next-intl
    verification:
      - kind: unit
        ref: lib/i18n/get-messages.test.ts
        status: pass
    human_judgment: true
    rationale: Immediate chrome update across screens needs visual confirmation in browser
duration: 15min
completed: 2026-08-04
status: complete
---

# Quick 260804-hed: 中文 / English / Italiano switching Summary

**Preference-driven zh/en/it UI catalogs with Chinese default — no next-intl.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-04T10:34:25Z
- **Completed:** 2026-08-04T10:42:00Z
- **Tasks:** 3/3
- **Files modified:** ~60 (task-scoped)

## Accomplishments

- Full `zh` / `en` / `it` catalogs with shared `getMessages`, `zoneLabel`, `categoryLabel`, `formatRelativeTime`
- `DEFAULT_PREFERENCES.language` and SSR snapshots default to `zh`
- All `components/` client UI migrated from `@/messages/it` to `useMessages()`
- API/push/manifest strings use `getMessages('zh')`; `DocumentLang` syncs `html[lang]`

## Task Commits

1. **Task 1 (RED):** `c39ef46` — test(260804-hed): add failing test for multi-locale getMessages
2. **Task 1 (GREEN):** `decf18b` — feat(260804-hed): add zh/en catalogs, resolver, and tracer UI path
3. **Task 2:** `467c4ee` — feat(260804-hed): migrate client UI to useMessages
4. **Task 3:** `785964d` — feat(260804-hed): server zh locale and document lang sync

_Docs SUMMARY commit left to orchestrator (`commit_docs` handling)._

## Files Created/Modified

- `messages/zh.ts` / `messages/en.ts` — full translated catalogs
- `messages/index.ts` — `DEFAULT_LANGUAGE`, catalogs, helpers
- `messages/it.ts` — `Messages` type, `categories` map, empty `languageNote`
- `lib/i18n/useMessages.ts` — preference-subscribed hook
- `lib/i18n/get-messages.test.ts` — resolver + helper coverage
- `components/shell/DocumentLang.tsx` — `zh→zh-CN`, `en→en`, `it→it`
- Client components under `components/` — string source via `useMessages`
- API routes + `process-events.ts` + `manifest.ts` — fixed zh locale

## Decisions Made

- No new i18n framework (D-QL-03)
- Default language zh (D-QL-02)
- Server cannot read localStorage prefs → fixed zh for API/push (D-QL-04)
- Language limitation note removed from Settings UI (D-QL-05)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — catalogs are fully populated; `languageNote` is intentionally empty and unused in UI.

## Threat Flags

None beyond plan register (API errors remain generic zh UX strings).

## Self-Check: PASSED

- FOUND: messages/zh.ts, messages/en.ts, messages/index.ts, lib/i18n/useMessages.ts, components/shell/DocumentLang.tsx
- FOUND commits: c39ef46, decf18b, 467c4ee, 785964d
- `rg "from '@/messages/it'" components/` → 0 matches
- `npx vitest run lib/i18n/` + `npm run lint` → pass
