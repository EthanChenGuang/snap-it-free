---
phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
plan: 08
subsystem: scraper
tags: [translation, gemini, openrouter, ingest, admin, queue, stitch]

requires:
  - phase: 06-scraper-admin-console-configurable-sources-frequency-anti-bl
    provides: scraper_global_config, translation_queue table, listing *_en/*_zh columns
provides:
  - Ingest-time Italian→en/zh translation with provider fallback
  - Daily translation cap shared across providers (D-43)
  - /admin/translation queue UI with retry actions (D-27)
affects:
  - 06-09
  - phase-05-trilingual-ui

tech-stack:
  added: []
  patterns:
    - "Gemini primary + OpenRouter fallback with fixed anti-injection system prompt"
    - "Scraper-local fetch-based translate engine (no @google/genai in worker bundle)"
    - "Post-persist translateAfterPersist — listing always persists on translation failure"

key-files:
  created:
    - lib/admin/operator-route.ts
    - scraper/src/subito/normalize.ts
    - scraper/src/translate/engine.ts
    - scraper/src/translate/ingest.ts
    - app/admin/translation/page.tsx
    - app/api/admin/translation/retry/route.ts
    - components/admin/TranslationQueueClient.tsx
  modified:
    - lib/admin/translate.ts
    - lib/admin/translation-cap.ts
    - lib/admin/translation-cap.test.ts
    - lib/admin/queries.ts
    - lib/admin/types.ts
    - lib/admin/schemas.ts
    - scraper/src/shared/persist.ts
    - scraper/src/shared/normalize.ts
    - scraper/src/shared/schema.ts
    - components/admin/admin-messages.ts

key-decisions:
  - "Checkpoint option-a: ingest-time en+zh columns at persist (D-24, D-44)"
  - "Scraper uses fetch-based engine copy in scraper/src/translate/engine.ts to avoid cross-package bundling"
  - "auto_translate toggle remains on settings page (Plan 09); translation page is read-only for toggle"

patterns-established:
  - "translateAfterPersist sequential per listing in persistBatch to respect rate limits"
  - "translation_queue upsert on failure; delete on success"

requirements-completed: [SCRP-02]

duration: 12min
completed: 2026-08-04
status: complete
---

# Phase 06 Plan 08: Ingest Translation Pipeline + Queue UI Summary

**Ingest-time Gemini/OpenRouter translation with daily cap, failure queue, and admin retry UI**

## Checkpoint

User approved **option-a** — ingest-time en+zh columns (D-24, D-44). Listing always persists; failures enter `translation_queue`.

## Accomplishments

- **Translation engine** (`lib/admin/translate.ts`): structured JSON prompt for title/description/category en+zh; input truncation 2000 chars; fixed system prompt (T-06-15); Gemini `gemini-2.0-flash` primary, OpenRouter `google/gemini-2.0-flash-001` fallback.
- **Daily cap** (`lib/admin/translation-cap.ts`): `checkAndIncrementUsage` reads/resets `translations_today` at UTC midnight; at cap pauses auto-translate only — scraping continues (D-43).
- **Ingest hook** (`scraper/src/translate/ingest.ts`): `translateAfterPersist` after upsert; updates `*_en/*_zh` or queues pending row with `last_error`.
- **Category extraction** (`scraper/src/subito/normalize.ts`): regalo URL segment → `listing.category`.
- **Admin UI** (`/admin/translation`): Stitch-ported table, 待翻译/失败 labels, per-row 重试 and bulk 重新翻译; empty state 翻译队列为空 (E6).
- **Retry API** (`POST /api/admin/translation/retry`): operator-gated; `{ listing_ids }` or `{ all_pending: true }`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created missing `lib/admin/operator-route.ts`**
- **Found during:** Task 2 (jobs route already imported it)
- **Issue:** `requireOperatorSession` module did not exist
- **Fix:** Thin wrapper over `getOperatorSession` returning 403 JSON
- **Files modified:** `lib/admin/operator-route.ts`
- **Commit:** ef8eff5

None otherwise — plan executed as written.

## Threat Mitigations

| Threat | Mitigation |
|--------|------------|
| T-06-15 prompt injection | Fixed system prompt; 2000-char input truncation |
| T-06-16 API spend DoS | `daily_translation_cap` with shared counter (D-43) |

## Verification

- `npm test -- lib/admin/translate.test.ts lib/admin/translation-cap.test.ts` — 7/7 pass
- `test -f app/admin/translation/page.tsx && test -f app/api/admin/translation/retry/route.ts` — pass

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | f627da2 | feat(06-08): ingest-time translation engine and daily cap |
| 2 | ef8eff5 | feat(06-08): translation queue admin UI and retry API |

## Self-Check: PASSED

- FOUND: scraper/src/translate/ingest.ts
- FOUND: app/admin/translation/page.tsx
- FOUND: lib/admin/translate.ts
- FOUND: f627da2
- FOUND: ef8eff5
