---
phase: 4
slug: auth-alerts-push-notifications
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-08-01
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` (root); `include: ['lib/**/*.test.ts']` |
| **Quick run command** | `npm run test:lib` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:lib`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-02 | 01 | 0 | AUTH-01, NOTF-01, D-96, NOTF-04 | T-04-04 | safeNextPath blocks open redirect; matcher AND logic | unit | `npm run test:lib -- lib/auth/safe-next-path.test.ts lib/alerts/matcher.test.ts lib/alerts/limit.test.ts lib/favorites/merge.test.ts lib/pwa/ios-detect.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 0 | NOTF-03 | — | Cron stub returns 401 without secret | integration | `test -f vercel.json && test -f app/api/cron/match-alerts/route.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | AUTH-01 | T-04-03 | OAuth PKCE callback persists session | manual | Google OAuth dev login → redirect to intended `next` | manual-only | ⬜ pending |
| 04-02-03 | 02 | 1 | AUTH-01 | — | Apple Sign In when configured | manual | Apple OAuth on configured provider | manual-only | ⬜ pending |
| 04-03-02 | 03 | 2 | AUTH-02, D-96 | T-04-01 | Favorites require auth; merge idempotent | unit | `npm run test:lib -- lib/favorites/merge.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-03 | 03 | 2 | AUTH-02 | — | Logged-out favorite opens AuthPromptModal | manual | Tap heart logged out → modal | manual-only | ⬜ pending |
| 04-04-02 | 04 | 3 | NOTF-01, NOTF-05 | T-04-02 | Alert CRUD requireAuth; max 5 enforced | unit | `npm run test:lib -- lib/alerts/limit.test.ts` | ❌ W0 | ⬜ pending |
| 04-05-02 | 05 | 4 | NOTF-01, NOTF-03 | — | Matcher writes alert_matches on cron | unit | `npm run test:lib -- lib/alerts/matcher.test.ts lib/alerts/unread-count.test.ts` | ❌ W0/W4 | ⬜ pending |
| 04-05-03 | 05 | 4 | NOTF-03 | — | Badge count reflects unread matches | manual | Insert test listing → wait ≤3 min → badge increments | manual-only | ⬜ pending |
| 04-06-02 | 06 | 5 | NOTF-02 | T-04-SC | web-push VAPID send; 410 deletes subscription | manual | Desktop push subscribe → test notification | manual-only | ⬜ pending |
| 04-07-02 | 07 | 6 | NOTF-04 | Pitfall 5 | iOS non-standalone shows A2HS before permission | unit | `npm run test:lib -- lib/pwa/ios-detect.test.ts` | ❌ W0 | ⬜ pending |
| 04-07-03 | 07 | 6 | NOTF-04 | Pitfall 5 | Push on real iPhone Home Screen install | manual | Physical iPhone A2HS → permission → receive push | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/auth/safe-next-path.ts` + `.test.ts` — open redirect guard (AUTH-01, D-90)
- [ ] `lib/alerts/matcher.ts` + `.test.ts` — keyword+zone AND match (NOTF-01, D-99)
- [ ] `lib/alerts/limit.ts` + `.test.ts` — max 5 alerts (NOTF-01, D-101)
- [ ] `lib/alerts/unread-count.ts` + `.test.ts` — unread match count (NOTF-03)
- [ ] `lib/favorites/merge.ts` + `.test.ts` — localStorage merge idempotent (D-96)
- [ ] `lib/pwa/ios-detect.ts` + `.test.ts` — standalone/iOS detection (NOTF-04)
- [ ] `supabase/migrations/016_auth_alerts_push.sql` — schema (D-95, D-98, D-103, D-112)
- [ ] `vercel.json` + `app/api/cron/match-alerts/route.ts` — cron stub (D-106 prep)
- [ ] Package install deferred to Plan 06: `@serwist/next`, `serwist`, `web-push`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth round-trip | AUTH-01 | Supabase dashboard + redirect URLs | Sign in with Google; land on `next` path |
| Apple Sign In | AUTH-01 | Apple Developer credentials | Sign in with Apple when provider configured |
| Favorite auth gate | AUTH-02 | Browser session UX | Logged out → heart → modal; logged in → persists |
| Post/DM auth gate regression | AUTH-02 | Phase 3 regression after OAuth | Logged out → /post and Contatta still show modal |
| Alert match badge E2E | NOTF-03 | Cron + DB timing | Create alert → insert listing → badge within 3 min |
| Web Push delivery | NOTF-02 | SW + browser permission | Subscribe → cron match → notification received |
| iOS A2HS funnel | NOTF-04 | Device + standalone mode | iOS Safari tab → install guide → standalone → permission |
| iPhone push E2E | NOTF-04 | Simulator cannot test push | Real iPhone Home Screen app receives push |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references in RESEARCH Test Map
- [ ] `nyquist_compliant: true` before phase seal
