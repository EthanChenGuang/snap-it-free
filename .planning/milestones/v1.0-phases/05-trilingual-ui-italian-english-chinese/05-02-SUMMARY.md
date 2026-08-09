---
phase: 05-trilingual-ui-italian-english-chinese
plan: 02
subsystem: api
tags: [i18n, supabase, push, profiles, locale, vitest]

requires:
  - phase: 05-01
    provides: Client language preference via writeAppPreferences and useMessages
provides:
  - Migration 017 profiles.language + push_subscriptions.locale (D-129 option-a)
  - PATCH /api/user/locale server sync on language change
  - Locale-aware push fan-out in process-events (D-136)
affects: [05-03, push-notifications, cron/match-alerts]

tech-stack:
  added: []
  patterns:
    - "profiles.language source of truth; push_subscriptions.locale synced on subscribe and PATCH"
    - "buildMatchPushContent resolves title/body per AppLanguage without module-scope messages"
    - "setAppLanguage fire-and-forget PATCH when authenticated"

key-files:
  created:
    - supabase/migrations/017_user_locale.sql
    - lib/user/locale.ts
    - lib/user/locale.test.ts
    - lib/user/locale-client.ts
    - app/api/user/locale/route.ts
    - lib/alerts/process-events.test.ts
  modified:
    - lib/alerts/process-events.ts
    - lib/notifications/push-schemas.ts
    - app/api/push/subscribe/route.ts
    - lib/pwa/usePushSubscribe.ts
    - components/settings/LanguageSection.tsx
    - components/shell/HeaderLanguageDropdown.tsx

key-decisions:
  - "D-129 option-a: profiles.language + push_subscriptions.locale (preselected at checkpoint)"
  - "D-130 preserved: API route error strings remain server-locale zh; push/cron localized only"
  - "resolveListingTitle inline in lib/user/locale.ts until Plan 03 shared helper lands"

patterns-established:
  - "loadUserLocales batch-fetches profiles for push fan-out user set"
  - "Push subscribe sends client locale from readAppPreferences with profile fallback"

requirements-completed: [I18N-01]

coverage:
  - id: D1
    description: Migration 017 creates profiles.language and push_subscriptions.locale with zh/en/it constraints
    requirement: I18N-01
    verification:
      - kind: other
        ref: "supabase/migrations/017_user_locale.sql"
        status: pass
    human_judgment: false
  - id: D2
    description: PATCH /api/user/locale syncs profiles and push subscriptions; language UI triggers sync when logged in
    requirement: I18N-01
    verification:
      - kind: unit
        ref: "lib/user/locale.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: process-events resolves getMessages per user locale and localized listing titles for push
    requirement: I18N-01
    verification:
      - kind: unit
        ref: "lib/alerts/process-events.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: End-to-end push notification body in user-selected language after subscribe
    requirement: I18N-01
    verification: []
    human_judgment: true
    rationale: Requires live VAPID + migration 017 applied + real device push trigger

duration: 15min
completed: 2026-08-04
status: complete
---

# Phase 5 Plan 02: Server Locale Storage + Push Localization Summary

**profiles.language with push_subscriptions.locale sync and per-user localized push fan-out via getMessages(locale)**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-04T18:03:00Z
- **Completed:** 2026-08-04T18:18:00Z
- **Tasks:** 4/4 (checkpoint option-a preselected)
- **Files modified:** 12

## Accomplishments

- Migration 017: `public.profiles` table with `language` column and RLS; `push_subscriptions.locale` column added
- `PATCH /api/user/locale` upserts profile language and updates all push subscriptions for the user
- `setAppLanguage` in Header and Settings fire-and-forget server sync when session exists
- Push subscribe route stores locale from client preference or profile fallback
- `process-events.ts` removed module-scope `getMessages('zh')`; per-user locale from profiles drives push title/body (D-136)

## Task Commits

1. **Migration 017 — profiles + push_subscriptions.locale** - `06da011` (feat)
2. **Locale sync API + client hook on language change** - `23b76a2` (feat)
3. **Locale-aware push fan-out in process-events (D-136)** - `f1191d6` (feat)

## Checkpoint Resolution

- **D-129 schema decision:** option-a selected (profiles.language + push_subscriptions.locale) — preselected by orchestrator

## Deviations from Plan

None — plan executed exactly as written with option-a schema.

## Self-Check: PASSED

- FOUND: supabase/migrations/017_user_locale.sql
- FOUND: lib/user/locale.ts
- FOUND: app/api/user/locale/route.ts
- FOUND: lib/alerts/process-events.test.ts
- FOUND: commit 06da011
- FOUND: commit 23b76a2
- FOUND: commit f1191d6
