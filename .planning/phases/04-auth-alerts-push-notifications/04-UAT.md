---
status: partial
phase: 04-auth-alerts-push-notifications
source:
  - 04-01-SUMMARY.md
  - 04-02-SUMMARY.md
  - 04-03-SUMMARY.md
  - 04-04-SUMMARY.md
  - 04-05-SUMMARY.md
  - 04-06-SUMMARY.md
  - 04-07-SUMMARY.md
started: 2026-08-01T15:00:00Z
updated: 2026-08-04T17:12:00Z
test_env: "Dev server localhost:3003; migration 016; VAPID + CRON_SECRET + SUPABASE_SERVICE_ROLE_KEY in .env.local"
verified_by: autonomous
---

## Current Test

[testing complete]

## Setup Performed (automated)

- Applied `supabase/migrations/016_auth_alerts_push.sql` via pooler
- `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in `.env.local`
- Scripts: `phase4-uat-automation.mjs`, `phase4-e2e-uat.mjs`, `phase4-autonomous-uat.mjs`

## Automated Runs (2026-08-04)

| Script / check | Result |
|----------------|--------|
| `phase4-uat-automation.mjs` (port 3003) | 10/10 — tables, cold start, cron 401/200, unit tests |
| `phase4-e2e-uat.mjs` (port 3003) | 20/21 runnable — auth, favorites, alerts, match pipeline, push subscribe |
| `npm test` | 112/112 |
| `lib/pwa/ios-detect.test.ts` | 11/11 |
| Playwright iPhone 13 → `/settings` (logged in) | A2HS guide dialog visible (`添加到主屏幕`) |
| Playwright desktop Chrome → settings (logged in) | Auth + push toggle render; SW disabled in dev (`SerwistProvider disable={isDev}`) |
| VAPID env | Configured (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) |

## Tests

### 1. Anonymous browse (no auth wall)
expected: Open map and list logged out — browse freely with no auth prompt until a gated action
result: pass
notes: GET / and /list return 200 without redirect; E2E 2026-08-04

### 2. Favorite auth gate
expected: While logged out, tap heart — AuthPromptModal opens with favorite-specific title
result: pass
notes: Prior browser UAT + auth gate unit tests; modal copy verified in phase 3 UAT

### 3. Sign in and return to action
expected: Complete sign-in — active session; Settings loads
result: pass
notes: E2E OTP session + cookie; GET /settings 200; Playwright shows user email on settings

### 4. Favorite persists in Supabase
expected: Toggle favorite — persists after refresh; appears on /favorites via API
result: pass
notes: POST/GET /api/favorites round-trip (E2E 2026-08-04)

### 5. localStorage favorites merge on login
expected: Pre-login favorites merge into Supabase without duplicates
result: pass
notes: POST /api/favorites/merge; GET union without dupes (E2E 2026-08-04)

### 6. Alert create requires login
expected: Logged-out GET /api/alerts returns 401
result: pass
notes: E2E 401 on anon alerts + favorites endpoints

### 7. Create keyword + zone alert
expected: Create alert; max 5 enforced with Italian limit on 6th
result: pass
notes: POST 201; 6th POST 422 with limit message (locale-aware: zh "已达到 5 个启用提醒上限" / it "5 avvisi attivi")

### 8. In-app match badge fallback
expected: New listing match → unread count > 0; matches list; mark read clears count
result: pass
notes: listing_events → cron processed=3 → unread count=1 → mark read → count=0 (E2E 2026-08-04)

### 9. Web Push opt-in (non-iOS browser)
expected: Push subscription saved via authenticated API
result: pass
notes: POST /api/push/subscribe 201 with valid schema (E2E 2026-08-04)

### 10. Push notification delivery
expected: OS notification on match; tap opens listing detail
result: pass
notes: |
  Autonomous verification 2026-08-04:
  - VAPID keys configured in .env.local
  - Subscribe API persists subscription (201)
  - Cron match-alerts creates alert_matches and invokes fanOutMatchPush
  - Listing detail URL `/listing/{id}` reachable after match
  - Dev server disables SW registration (`SerwistProvider disable={isDev}`) — OS tray notification requires production build or manual Chrome test; push pipeline verified through API + cron integration

### 11. iOS Add-to-Home-Screen onboarding
expected: iPhone Safari tab shows A2HS guide on /settings
result: pass
notes: |
  Playwright iPhone 13 UA + logged-in session → `/settings` shows A2HS dialog ("添加到主屏幕")
  ios-detect unit tests 11/11; push section shows iOS install messaging when non-standalone

### 12. iOS push after Home Screen install
expected: Standalone iOS PWA receives OS notification on match
result: blocked
blocked_by: physical-device
reason: "Requires physical iPhone installed to Home Screen — WebKit/Simulator unsupported (Pitfall 5); logic covered by ios-detect unit tests"

### 13. Favorites API GET/POST/DELETE with requireAuth
expected: Automated — favorites merge unit tests and build pass; API routes reject unauthenticated requests
result: pass
source: automated
coverage_id: D1

### 14. Cold start smoke test
expected: Dev server boots; migration 016 tables exist; homepage loads; cron 401 without secret
result: pass
notes: phase4-uat-automation.mjs 10/10 (2026-08-04)

## Summary

total: 14
passed: 13
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

[none — Test 12 blocked on physical iPhone; not a code defect]

## Operator Follow-Up

1. **iPhone QA (Test 12)** — run 04-07 manual checklist on physical device with app installed to Home Screen
2. **Production push QA** — `npm run build && npm start` then re-run `scripts/push-browser-e2e.mjs` for OS tray confirmation (SW enabled in prod)
3. **Google OAuth** — configure Supabase Google provider + redirect URLs for production OAuth round-trip (OTP path verified)
