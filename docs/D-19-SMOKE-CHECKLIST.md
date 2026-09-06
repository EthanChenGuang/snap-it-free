# D-19 Production Smoke Checklist

**Document ID:** D-19
**Phase:** 07-production-deploy-vercel-fly-io
**Launch scope:** Subito-only ingest at launch (D-07-16/56). Other scraper sources are disabled and out of launch scope.
**Severity levels:** Blocker (must pass before go-live) · Warning (acceptable to ship with, must be tracked) · Deferred (explicitly out of Phase 7 scope).

Run against the canonical production URL (`APP_URL` from `docs/DEPLOY-RUNBOOK.md`). Use an operator/test-controlled account only — never record PII or real user content in this checklist's evidence (D-07-63/65). Tag and clean up any test data created during this run (D-07-64).

---

## PWA Load & Service Worker (D-07-52)

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 1 | `/` returns 2xx and renders the feed grid | Blocker | ☐ |
| 2 | DevTools → Application → Service Workers shows `/sw.js` registered | Blocker | ☐ |
| 3 | Hard refresh / update does not white-screen | Blocker | ☐ |
| 4 | Basic cached shell / offline behavior works (airplane mode reload shows cached shell, not a network error page) | Warning | ☐ |

## Auth / OAuth (TD-03)

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 5 | Google login completes end-to-end on the production URL and lands on the intended `next` path via `/auth/callback` | Blocker | ☑ pass (2026-09-06 — Plan 01 human-verify: `/post` → Continue with Google → authenticated posting form on `https://zerodollar-blond.vercel.app`; Supabase Site URL fix documented in DEPLOY-RUNBOOK §4/§5; re-confirmed Plan 07-04) |
| 6 | Email OTP login completes end-to-end | Blocker | ☐ |
| 7 | Session persists across reload | Blocker | ☑ pass (2026-09-06 — same Plan 01 session; Settings shows linked account after refresh on production) |

## Register-First Auth Gates (Phase 19 — D-19-01/04/05/06/11)

Cross-reference scenarios 1–12 from `scripts/phase19-uat-automation.mjs` and `.planning/phases/19-register-first-auth-gates/19-UAT.md`, adapted to the production `APP_URL`.

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 8 | Anonymous `/` feed grid loads without an auth modal (AUTH-08) | Blocker | ☐ |
| 9 | Guest `/listing/[id]` shows the preview wall (title + hero + CTA only) — full detail requires login (AUTH-01) | Blocker | ☐ |
| 10 | Inline guest auth on the preview heart / login CTA works (`DetailPreviewWall` + `AuthPromptForm`) | Blocker | ☐ |
| 11 | Favorites bottom-nav tab requires login (AUTH-03) | Blocker | ☐ |
| 12 | `/post` enforces a page-level gate on entry for guests (AUTH-04) | Blocker | ☐ |
| 13 | Shared listing link Open Graph tags remain public (no auth required to render OG preview) | Blocker | ☐ |

## Browse / Feed / Post (D-07-45)

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 14 | Feed shows recent Subito listings after at least one successful production Subito run (D-07-25) | Blocker | ☐ |
| 15 | Search and filter sheet (city + category) return expected results | Blocker | ☐ |
| 16 | Favorites: add/remove a listing as a logged-in test account | Blocker | ☐ |
| 17 | Post: submit a UGC test listing end-to-end, then delete it during cleanup (D-07-64) | Blocker | ☐ |
| 18 | Historical listings from other sources (previously scraped before this phase) may still be visible in the feed until their expiry window elapses — this is expected and not a launch failure (D-07-25) | Deferred | ☐ |

## Push Notifications (D-07-31, D-07-46, TD-02)

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 19 | Settings push toggle enables successfully on production (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` matches server `VAPID_PUBLIC_KEY`) | Blocker | ☐ |
| 20 | Server-sent test push arrives in the browser | Blocker | ☐ |
| 21 | **TD-02 — physical iPhone standalone PWA push:** install to Home Screen (A2HS), open from the icon (not a Safari tab), enable push in Settings, and confirm a push notification is received while the app is closed | Blocker | ☐ |

## Admin Console (D-07-51)

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 22 | `/admin` Overview loads with correct platform/source cards | Blocker | ☐ |
| 23 | `/admin` Sources page loads; Subito source shows enabled, correct schedule | Blocker | ☐ |
| 24 | Disabled-source admin/config surfaces (all sources other than Subito) load without a runtime error | Warning | ☐ |
| 25 | `/admin` Runs page shows the production Subito run history | Blocker | ☐ |
| 26 | `/admin` Settings / proxy page loads and reflects the operator-configured proxy toggle | Blocker | ☐ |

## Worker — Subito Production Run (D-07-20/21)

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 27 | Trigger one Subito run via the GitHub Actions scheduler (manual `workflow_dispatch`) or the admin manual-run control | Blocker | ☐ |
| 28 | The triggered run completes with status `success` (not `failed`) and inserts/updates listings | Blocker | ☐ |
| 29 | Scheduler behavior for the single enabled source matches DB `next_run_at` / interval config after the run | Blocker | ☐ |

## Alert Cron (D-07-50)

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 30 | `curl -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/match-alerts` returns 200 with a `processed` count (may be 0) | Blocker | ☐ |
| 31 | `curl $APP_URL/api/cron/match-alerts` (no header) returns 401 | Blocker | ☐ |
| 32 | Whichever operator alert channel is already configured (Telegram / WhatsApp / WeChat / email) delivers a test message | Blocker | ☐ |

## Rollback Readiness

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 33 | `docs/DEPLOY-RUNBOOK.md` §9 rollback commands reviewed and understood before go-live | Blocker | ☐ |
| 34 | Custom domain cutover is explicitly deferred until after this checklist passes | Deferred | ☐ |

---

## Evidence Notes

Record only non-PII evidence (status codes, screenshots with test data only, log excerpts with secrets redacted). Example row:

| Check # | Evidence | Cleaned up? |
|---------|----------|-------------|
| 17 | Test post `zz-smoke-test-001` created and removed | ☐ |

## Sign-off

- [ ] All Blocker rows pass.
- [ ] All Warning rows reviewed; any failures tracked as known issues, not launch blockers.
- [ ] Deferred rows acknowledged as out of scope for this launch.
- [ ] Test data cleanup complete (posts, storage media, favorites, alert matches, listing events).

**Operator sign-off / date:** ___________________________
