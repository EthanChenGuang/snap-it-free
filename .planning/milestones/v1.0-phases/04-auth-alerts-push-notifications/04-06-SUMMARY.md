---
phase: 04-auth-alerts-push-notifications
plan: 06
subsystem: notifications
tags: [web-push, serwist, vapid, pwa, cron]
requires: [04-05]
provides: [NOTF-02]
affects: [04-07]
tech-stack:
  added: ["@serwist/next@9.5.12", "serwist@9.5.12", "web-push@3.6.7", "@types/web-push@3.6.4"]
  patterns: [Serwist SW precache, VAPID server signing, push_subscriptions RLS insert]
key-files:
  created:
    - app/sw.ts
    - app/manifest.ts
    - app/api/push/subscribe/route.ts
    - lib/notifications/web-push.ts
    - lib/notifications/push-schemas.ts
    - lib/pwa/vapid.ts
    - components/providers/SerwistProvider.tsx
    - components/settings/PushToggleSection.tsx
    - public/icons/icon-192.png
    - public/icons/icon-512.png
  modified:
    - next.config.ts
    - app/layout.tsx
    - lib/alerts/process-events.ts
    - components/settings/AlertsSection.tsx
    - messages/it.ts
    - package.json
decisions:
  - "Delete-then-insert for push_subscriptions (RLS has no UPDATE policy)"
  - "One push per user per listing match (dedupe across multiple alert hits)"
  - "iOS push toggle disabled until Plan 07 A2HS funnel"
metrics:
  duration: "~8m"
  completed: "2026-08-01"
status: complete
---

# Phase 4 Plan 06: Web Push Summary

**One-liner:** Serwist service worker + VAPID web-push fan-out from cron matcher with Settings push toggle for non-iOS browsers.

## Completed

| Task | Commit | Outcome |
|------|--------|---------|
| Package legitimacy checkpoint | — | Serwist verified (npm serwist org, ~418K/wk, MIT, no postinstall) |
| End-to-end push tracer | c4759cb | SW, subscribe API, cron push fan-out, manifest, icons |
| PushToggle integration | 9439c56 | Settings toggle below alerts; VAPID env guard |

## Operator VAPID Setup

1. Generate keys:
   ```bash
   npx web-push generate-vapid-keys --json
   ```
2. Set env vars (production + `.env.local`):
   - `VAPID_PUBLIC_KEY` — from JSON `publicKey`
   - `VAPID_PRIVATE_KEY` — from JSON `privateKey` (server only, never `NEXT_PUBLIC_`)
   - `VAPID_SUBJECT` — e.g. `mailto:ops@yourdomain.com`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — same value as `VAPID_PUBLIC_KEY`
3. Redeploy after setting env vars.
4. Manual test: Chrome → Settings → enable push toggle → trigger cron match → OS notification → click opens `/listing/[id]`.

## Verification

- `npm run test:lib` — 83 tests passed
- `npm run build` — success; Serwist bundled `public/sw.js`
- Client bundle grep — no `VAPID_PRIVATE_KEY` in `.next/static`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] push_subscriptions upsert blocked by RLS**
- **Found during:** Task 2
- **Issue:** Migration 016 has INSERT/SELECT/DELETE policies only; upsert UPDATE fails RLS
- **Fix:** Delete existing row by `(user_id, endpoint)` then insert
- **Files modified:** `app/api/push/subscribe/route.ts`
- **Commit:** c4759cb

**2. [Rule 2 - Missing functionality] Created public/icons for manifest/SW**
- **Found during:** Task 2
- **Issue:** No `public/` directory existed; manifest referenced missing icons
- **Fix:** Generated 192/512 PNG icons via sharp
- **Commit:** c4759cb

None otherwise — plan executed as written.

## Auth Gates

None.

## Known Stubs

None blocking NOTF-02.

## Self-Check: PASSED

- FOUND: app/sw.ts, lib/notifications/web-push.ts, app/api/push/subscribe/route.ts, public/sw.js
- FOUND: c4759cb, 9439c56
