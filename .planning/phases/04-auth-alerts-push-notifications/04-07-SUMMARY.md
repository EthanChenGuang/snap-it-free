---
phase: 04-auth-alerts-push-notifications
plan: 07
subsystem: pwa
tags: [ios, a2hs, push, onboarding, pwa]
requires: [04-06]
provides: [NOTF-04]
affects: []
tech-stack:
  added: []
  patterns: [iOS A2HS funnel, D-110 permission gates, localStorage dismiss persistence]
key-files:
  created:
    - components/pwa/IosInstallGuide.tsx
    - components/providers/PwaOnboardingProvider.tsx
    - lib/pwa/usePushSubscribe.ts
  modified:
    - lib/pwa/ios-detect.ts
    - lib/pwa/ios-detect.test.ts
    - components/settings/PushToggleSection.tsx
    - components/settings/MatchesSection.tsx
    - app/layout.tsx
    - messages/it.ts
decisions:
  - "Guide auto-shows once per session on /settings when iOS non-standalone (sessionStorage)"
  - "Dismiss persists in localStorage shoumanwu_ios_push_dismissed; re-open via Installa l'app / Come installare"
  - "Non-standalone dismissed users see badge fallback note, not push toggle"
metrics:
  duration: "~12m"
  completed: "2026-08-01"
status: complete
---

# Phase 4 Plan 07: iOS A2HS Funnel Summary

**One-liner:** iOS Add-to-Home-Screen onboarding with D-110 permission gates, Settings push integration, and badge fallback for tab-only users.

## Completed

| Task | Commit | Outcome |
|------|--------|---------|
| End-to-end iOS funnel (tracer) | b956f95 | IosInstallGuide, usePushSubscribe gates, PwaOnboardingProvider, PushToggleSection |
| Badge fallback messaging | c359968 | MatchesSection + Settings inline note when guide dismissed (D-115) |
| Physical iPhone QA | — | **Pending manual sign-off** (see checklist below) |

## Manual iPhone QA Checklist (NOTF-04)

> Required on a **physical iPhone** — iOS Simulator cannot test Web Push (Pitfall 5).

1. **Tab-only Safari (not standalone)**
   - Log in and open `/settings`
   - Confirm A2HS guide modal appears (Share → Aggiungi a Home steps)
   - Tap **Continua senza push** — guide should not reappear on every navigation
   - Confirm badge fallback note in Push section and Nuovi match section
   - Create an alert; trigger a test match — confirm BottomNav badge updates without push

2. **Install to Home Screen**
   - Safari → Share → **Aggiungi a Home** → open app from Home Screen icon
   - Return to Settings → enable push toggle
   - Grant notification permission when prompted
   - Confirm toggle stays enabled after reload

3. **Push delivery**
   - With push enabled, create/trigger alert match
   - Confirm OS notification received on lock screen
   - Tap notification — app opens to listing detail

4. **Regression (non-iOS)**
   - Chrome/Android: push toggle works without A2HS guide

**Sign-off:** Type "approved" in checkpoint or note any failures.

## Verification

- `npm run test:lib -- lib/pwa/ios-detect.test.ts` — 11 tests passed (90 total lib tests)
- `npm run build` — success

## Deviations from Plan

None — plan executed as written.

## Auth Gates

None.

## Known Stubs

None blocking NOTF-04 implementation. Push delivery on iOS requires physical device QA above.

## Self-Check: PASSED

- FOUND: components/pwa/IosInstallGuide.tsx
- FOUND: components/providers/PwaOnboardingProvider.tsx
- FOUND: lib/pwa/usePushSubscribe.ts
- FOUND: b956f95, c359968
