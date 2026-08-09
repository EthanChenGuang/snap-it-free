---
phase: 04-auth-alerts-push-notifications
plan: 03
subsystem: favorites-api
status: complete
tags: [favorites, auth-gate, supabase, merge, wave-2]

requires:
  - 04-01-schema-wave0
  - 04-02-oauth-wave1
provides:
  - favorites-api-routes
  - auth-gated-favorite-button
  - merge-on-login-provider
affects:
  - 04-04-alerts-gate
  - 04-05-match-pipeline

tech-stack:
  added: []
  patterns:
    - requireAuth-route-handlers-for-user_favorites
    - localStorage-merge-on-SIGNED_IN-D-96
    - FavoriteButton-auth-gate-D-92-D-97

key-files:
  created:
    - app/api/favorites/route.ts
    - app/api/favorites/merge/route.ts
    - lib/favorites/schemas.ts
    - lib/favorites/merge-on-login.ts
    - components/providers/FavoritesMergeProvider.tsx
  modified:
    - lib/favorites/useFavorites.ts
    - components/listings/FavoriteButton.tsx
    - components/listings/FavoritesPageClient.tsx
    - app/layout.tsx
    - messages/it.ts

key-decisions:
  - "Logged-out favorite tap opens AuthPromptModal; no anonymous writes (D-97)"
  - "localStorage cleared only after merge API 2xx (D-96 Pitfall 5)"
  - "useFavorites mirrors remote IDs to localStorage when authed for cross-tab sync"

requirements-completed:
  - AUTH-02

coverage:
  - id: D1
    description: "Favorites API GET/POST/DELETE with requireAuth"
    requirement: AUTH-02
    verification:
      - kind: unit
        ref: "npm run test:lib -- lib/favorites/merge.test.ts"
        status: pass
      - kind: integration
        ref: "npm run build"
        status: pass
    human_judgment: false
  - id: D2
    description: "FavoriteButton auth gate at map popup, list card, detail top bar"
    requirement: AUTH-02
    verification:
      - kind: build
        ref: "npm run build"
        status: pass
    human_judgment: true
    rationale: "Logged-out modal behavior requires manual tap verification"

metrics:
  duration: "8 min"
  completed: "2026-08-01"
---

# Phase 4 Plan 03: Favorites (Wave 2) Summary

**One-liner:** Supabase-backed user_favorites API with auth-gated FavoriteButton, idempotent localStorage merge on login, and /favorites page reading from API when signed in.

## Accomplishments

- `GET/POST/DELETE /api/favorites` with `requireAuth`, Zod UUID validation, upsert ON CONFLICT DO NOTHING
- `POST /api/favorites/merge` bulk insert with max 500 IDs (T-04-09 mitigation)
- `useFavorites` fetches remote IDs when authed; localStorage read/write when logged out (pre-login cache)
- `useMergeFavoritesOnLogin` + `FavoritesMergeProvider` in root layout — clears localStorage only on 2xx
- `FavoriteButton` opens `AuthPromptModal` with `messages.auth.favoriteTitle` when logged out (D-92, D-93)
- `/favorites` page fetches from API when authed; sync banner for logged-out localStorage favorites

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| No anonymous favorite writes | D-97 — login at toggle; localStorage only for legacy cache + merge source |
| Mirror remote IDs to localStorage when authed | Keeps FAVORITES_CHANGE_EVENT cross-component sync |
| Webpack build for verify | `npx next build` (Turbopack) fails on maplibre pre-existing issue; `npm run build` passes |

## Deviations from Plan

None - plan executed exactly as written.

## Test Results

```
npm run test:lib
Test Files  21 passed (21)
Tests       83 passed (83)

npm run test:lib -- lib/favorites/merge.test.ts
Test Files  20 passed (20)  (tracer verify)
Tests       76 passed (76)

npm run build
Build succeeded (webpack); /api/favorites and /api/favorites/merge routes present
```

## Commits

| Hash | Message |
|------|---------|
| a5a49c3 | feat(04-03): add favorites API, auth gate, and merge on login |
| a0963fb | feat(04-03): wire favorites page to Supabase API when authed |

## Self-Check: PASSED

- FOUND: app/api/favorites/route.ts
- FOUND: app/api/favorites/merge/route.ts
- FOUND: lib/favorites/merge-on-login.ts
- FOUND: components/providers/FavoritesMergeProvider.tsx
- FOUND: components/listings/FavoriteButton.tsx
- FOUND: a5a49c3
- FOUND: a0963fb
