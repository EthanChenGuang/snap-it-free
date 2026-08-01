---
phase: 04-auth-alerts-push-notifications
plan: 04
subsystem: auth-alerts-push
status: complete
tags: [alerts-crud, settings-ui, zod, requireAuth, NOTF-01, NOTF-05]

requires:
  - 04-01
  - 04-02
provides:
  - alerts-api-crud
  - settings-profile-alerts-ui
affects:
  - 04-05-matcher-cron
  - 04-06-push

tech-stack:
  added: []
  patterns:
    - requireAuth-route-handlers
    - zod-create-update-schemas
    - stitch-settings-sections

key-files:
  created:
    - app/api/alerts/route.ts
    - app/api/alerts/[id]/route.ts
    - lib/alerts/schemas.ts
    - lib/alerts/schemas.test.ts
    - components/settings/ProfileSection.tsx
    - components/settings/AlertsSection.tsx
    - components/settings/AlertCreateSheet.tsx
    - components/settings/ZoneChipSelector.tsx
    - components/settings/SettingsPageClient.tsx
  modified:
    - app/settings/page.tsx
    - messages/it.ts

key-decisions:
  - "Alert CRUD only via /api/alerts with requireAuth — no client PostgREST (D-102)"
  - "Max 5 enabled alerts enforced on POST and re-enable PATCH (D-101)"
  - "ZoneChipSelector uses null zone for Tutti / all zones (D-117)"
  - "Map CTA deferred — messages.settings.alerts.mapCta stub only (D-117 optional)"

requirements-completed:
  - NOTF-01
  - NOTF-05

metrics:
  duration: "8 min"
  completed: "2026-08-01"
---

# Phase 4 Plan 04: Alerts CRUD + Settings Summary

**One-liner:** Authenticated alerts CRUD with max-5 enforcement, Stitch-ported Settings (Profile + Alerts), zone chip create sheet, and Italian strings.

## Accomplishments

- `CreateAlertSchema` / `UpdateAlertSchema` with keyword+zone refine mirroring DB CHECK (D-98)
- `GET/POST /api/alerts` and `PATCH/DELETE /api/alerts/[id]` with `requireAuth`, owner-scoped updates, 422 on 6th enabled alert
- Settings expanded: `ProfileSection` (email + sign out / Accedi modal), `AlertsSection` (list, toggle, delete, create sheet)
- `ZoneChipSelector` reuses Phase 2 chip styling; Tutti = null zone (D-117)
- Deep link support via `/settings?tab=alerts` after auth redirect (D-93)
- Logged-out users see Accedi CTA; alert create gated via `AuthPromptModal` (NOTF-05)

## Test Results

```
npm run test:lib -- lib/alerts/schemas.test.ts lib/alerts/limit.test.ts
Test Files  21 passed (21)
Tests       83 passed (83)
```

Schema tests: 7 passed (empty rejection, keyword-only, zone-only, trim, max length).

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Drawer for AlertCreateSheet | Matches existing vaul drawer pattern; avoids new route |
| Count enabled alerts only for limit | Aligns with D-101 "active alerts" semantics |
| Map CTA not wired | D-117 optional; `mapCta` string reserved in messages |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Description | Future plan |
|------|-------------|-------------|
| `messages/it.ts` → `settings.alerts.mapCta` | Map "Crea avviso" CTA string only, no map wiring | Polish / optional |

## Threat Flags

None beyond plan threat model — all mitigations applied (requireAuth, Zod max length, parameterized Supabase queries).

## Self-Check: PASSED

- FOUND: app/api/alerts/route.ts
- FOUND: app/api/alerts/[id]/route.ts
- FOUND: lib/alerts/schemas.ts
- FOUND: lib/alerts/schemas.test.ts
- FOUND: components/settings/AlertsSection.tsx
- FOUND: fb36f85 (tracer commit)
- FOUND: 670b7c1 (test commit)
