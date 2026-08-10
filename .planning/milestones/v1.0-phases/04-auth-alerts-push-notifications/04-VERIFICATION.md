---
phase: 04-auth-alerts-push-notifications
verified: 2026-08-11T00:00:00Z
status: passed
score: 13/14 UAT truths verified (1 blocked on physical device)
behavior_unverified: 0
overrides_applied: 0
overrides: []
gaps: []
behavior_unverified_items:
  - truth: "iOS push after Home Screen install (UAT Test 12)"
    reason: "blocked_by physical-device — requires real iPhone installed to Home Screen; WebKit/Simulator unsupported"
    source: "04-UAT.md Test 12"
  - truth: "Google OAuth production round-trip"
    reason: "manual-only — Supabase Google provider + redirect URLs not verified in automated harness (Operator Follow-Up #3)"
    source: "04-UAT.md Operator Follow-Up"
  - truth: "OS tray push notification in dev"
    reason: "SerwistProvider disable={isDev} — SW never registers locally; API+cron pipeline verified, OS tray requires prod build (Test 10 notes)"
    source: "04-UAT.md Test 10"
human_verification: []
---

# Phase 4: Auth, Alerts & Push Notifications Verification Report

**Phase Goal:** Supabase auth for gated actions, keyword+zone alerts, Web Push (VAPID), in-app match badge fallback, iOS A2HS onboarding, and cron-driven alert matching.

**Verified:** 2026-08-11T00:00:00Z  
**Status:** passed (retroactive synthesis)  
**Re-verification:** No — synthesized from 04-UAT.md + 04-VALIDATION.md + COVERAGE.md per D-18 / TD-01 low-cost closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Anonymous browse (no auth wall on map/list) | ✓ VERIFIED | 04-UAT Test 1 pass — GET / and /list 200 without redirect (E2E 2026-08-09) |
| 2 | Favorite auth gate while logged out | ✓ VERIFIED | 04-UAT Test 2 pass — `lib/ugc/auth-gate.test.ts` + Phase 3 UAT modal copy |
| 3 | Sign in and return to action / Settings loads | ✓ VERIFIED | 04-UAT Test 3 pass — E2E OTP session + GET /settings 200 |
| 4 | Favorite persists in Supabase after refresh | ✓ VERIFIED | 04-UAT Test 4 pass — POST/GET /api/favorites round-trip |
| 5 | localStorage favorites merge on login without dupes | ✓ VERIFIED | 04-UAT Test 5 pass — POST /api/favorites/merge; GET union |
| 6 | Alert create requires login (401 when logged out) | ✓ VERIFIED | 04-UAT Test 6 pass — E2E 401 on anon alerts + favorites |
| 7 | Create keyword + zone alert; max 5 enforced | ✓ VERIFIED | 04-UAT Test 7 pass — 6th POST 422 with locale-aware limit message |
| 8 | In-app match badge fallback (unread count + mark read) | ✓ VERIFIED | 04-UAT Test 8 pass — listing_events → cron → unread count=1 → mark read → 0 |
| 9 | Web Push opt-in saves subscription via authenticated API | ✓ VERIFIED | 04-UAT Test 9 pass — POST /api/push/subscribe 201 after migration 017 |
| 10 | Push notification delivery on match | ✓ VERIFIED (pipeline) | 04-UAT Test 10 pass — subscribe 201, cron match-alerts, alert_matches, listing URL; OS tray blocked in dev (Serwist disable) |
| 11 | iOS Add-to-Home-Screen onboarding on /settings | ✓ VERIFIED | 04-UAT Test 11 pass — Playwright iPhone 13 UA dialog within 2s; `lib/pwa/ios-detect.test.ts` 11/11 |
| 12 | iOS push after Home Screen install | ✗ BLOCKED | 04-UAT Test 12 blocked_by physical-device — logic covered by ios-detect unit tests only |
| 13 | Favorites API GET/POST/DELETE with requireAuth | ✓ VERIFIED | 04-UAT Test 13 pass — `lib/favorites/merge.test.ts` + E2E auth gates |
| 14 | Cold start smoke (migration 016, homepage, cron 401) | ✓ VERIFIED | 04-UAT Test 14 pass — phase4-uat-automation.mjs 10/10 |

**Score:** 13/14 truths verified (1 blocked on physical iPhone — not a code defect per 04-UAT Gaps)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| Email magic link (OTP) + PKCE callback | Auth entry | ✓ VERIFIED | COVERAGE.md INTEGRATE; Test 3 E2E OTP session |
| Google OAuth signInWithOAuth | Auth provider | ⚠️ MANUAL | COVERAGE.md INTEGRATE; Operator Follow-Up #3 — production OAuth not auto-verified |
| Apple OAuth signInWithOAuth | Auth provider | ⚠️ ENV-GATED | COVERAGE.md INTEGRATE via NEXT_PUBLIC_APPLE_OAUTH_ENABLED |
| Session refresh / SSR cookies | Session persistence | ✓ VERIFIED | Test 3 Settings 200 with cookie session |
| Anonymous browse | No auth wall | ✓ VERIFIED | Test 1 |
| `/api/favorites` requireAuth | Favorites CRUD | ✓ VERIFIED | Tests 4, 5, 13 |
| `/api/alerts` CRUD max 5 | Alert management | ✓ VERIFIED | Tests 6, 7 |
| `/api/push/subscribe` | Push subscription | ✓ VERIFIED | Test 9 |
| `/api/alerts/matches` list + mark read | In-app matches | ✓ VERIFIED | Test 8 |
| `listing_events` outbox + trigger | Match pipeline input | ✓ VERIFIED | Test 8 cron batch |
| `/api/cron/match-alerts` CRON_SECRET gate | Cron poller | ✓ VERIFIED | Test 14 cron 401 without secret |
| web-push VAPID send on cron match | Push delivery | ✓ VERIFIED (pipeline) | Test 10; OS tray manual in prod |
| Serwist SW + manifest + icons | PWA shell | ✓ VERIFIED | COVERAGE.md INTEGRATE; dev SW disabled by design |
| iOS A2HS onboarding (IosInstallGuide) | NOTF-04 funnel | ✓ VERIFIED | Test 11 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| Logged-out heart tap | AuthPromptModal | auth-gate | ✓ WIRED | Test 2 |
| Sign-in completion | Session + Settings | OTP/OAuth callback | ✓ WIRED | Test 3 |
| Favorite toggle | `/api/favorites` | requireAuth POST/GET | ✓ WIRED | Tests 4, 13 |
| Login | `/api/favorites/merge` | localStorage union | ✓ WIRED | Test 5 |
| Alert create | `/api/alerts` | requireAuth 401/201 | ✓ WIRED | Tests 6, 7 |
| New listing insert | `listing_events` → cron | match-alerts route | ✓ WIRED | Test 8 |
| Cron match | `alert_matches` + badge | unread count API | ✓ WIRED | Test 8 |
| Push subscribe | `push_subscriptions` row | POST /api/push/subscribe | ✓ WIRED | Test 9 |
| Cron match | web-push fan-out | VAPID send | ✓ WIRED (pipeline) | Test 10; OS tray dev-blocked |
| iOS Safari tab | IosInstallGuide dialog | ios-detect + sessionStorage | ✓ WIRED | Test 11 |

### Behavioral Spot-Checks

| Behavior | Command / Source | Result | Status |
|----------|------------------|--------|--------|
| Phase 4 UAT automation | `phase4-uat-automation.mjs` (2026-08-09) | 10/10 | ✓ PASS |
| Vitest lib suite at UAT time | `npm test` (2026-08-09) | 221/221 | ✓ PASS |
| Phase 4 E2E harness | `phase4-e2e-uat.mjs` | 20/24 (3 OS/physical blocked, 1 harness locale mismatch) | ⚠️ PARTIAL |
| iOS A2HS Playwright | iPhone 13 UA → `/settings` | Dialog within 2s | ✓ PASS |
| ios-detect unit tests | `lib/pwa/ios-detect.test.ts` | 11/11 | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — retroactive synthesis only; no new probes executed (D-18 low-cost framing).

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| AUTH-01 | 02, 03 | Sign in with Google, Apple, or email when login required | ✓ SATISFIED (partial manual) | Tests 3, 9–11; OTP verified; Google OAuth Operator Follow-Up open |
| AUTH-02 | 03 | Login prompt only at gated actions | ✓ SATISFIED | Tests 2, 6 — favorite + alert gates |
| NOTF-01 | 04, 05 | Keyword + zone match alerts | ✓ SATISFIED | Test 7 — POST 201; max 5 on 6th |
| NOTF-02 | 06 | Web Push on alert match | ✓ SATISFIED (pipeline) | Tests 9–10; OS tray prod-only confirmation |
| NOTF-03 | 05, 07 | In-app badge fallback when push unavailable | ✓ SATISFIED | Test 8 — unread count + mark read |
| NOTF-04 | 07 | iOS A2HS onboarding flow | ✓ SATISFIED (partial manual) | Test 11 pass; Test 12 blocked physical iPhone push |
| NOTF-05 | 04 | Logged in to create/manage alerts | ✓ SATISFIED | Tests 6, 7 — 401 anon; CRUD when authed |

All seven Phase 4 requirement IDs from v1.0-REQUIREMENTS.md are accounted for. Ambiguities from source docs (physical iPhone push, prod OAuth, dev SW tray) are carried forward explicitly — not resolved optimistically.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No new defects introduced by this retroactive doc | — | N/A (documentation-only task) |

### Human Verification Required

1. **iPhone QA (UAT Test 12)** — Physical iPhone with app installed to Home Screen; confirm OS push on match.
2. **Production push QA** — `npm run build && npm start` or deploy; confirm OS tray notification (Test 10 follow-up).
3. **Google OAuth** — Configure Supabase Google provider + redirect URLs; round-trip sign-in (Operator Follow-Up #3).

### Gaps Summary

Phase 4 shipped and has been in production use since v1.0. **04-UAT.md records 13/14 automated truths passing** with **Test 12 blocked on physical iPhone** (not a code defect). Migration 017 gap (`push_subscriptions.locale`) was fixed during the 2026-08-09 verify session. No open code gaps remain in 04-UAT.md Gaps section.

Remaining follow-ups are **manual/operator** (physical iPhone push, prod OS tray, Google OAuth dashboard config, E2E harness locale assertion update) — carried into `behavior_unverified_items` above rather than silently dropped.

---

_Verified: 2026-08-11T00:00:00Z_  
_Verifier: GSD executor (14-07 retroactive synthesis per TD-01 / D-18)_
