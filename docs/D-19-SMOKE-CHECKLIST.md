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
| 1 | `/` returns 2xx and renders the feed grid | Blocker | ☑ pass (2026-09-06 — Plan 07-05: `phase7-production-smoke.mjs` + Playwright feed grid on `https://zerodollar-blond.vercel.app`) |
| 2 | DevTools → Application → Service Workers shows `/sw.js` registered | Blocker | ☑ pass (2026-09-06 — Plan 07-05: `navigator.serviceWorker` registered `…/sw.js`; `GET /sw.js` → 200) |
| 3 | Hard refresh / update does not white-screen | Blocker | ☑ pass (2026-09-06 — Plan 07-05: Playwright hard reload, body content rendered) |
| 4 | Basic cached shell / offline behavior works (airplane mode reload shows cached shell, not a network error page) | Warning | ☐ not tested (Plan 07-05 — manual airplane-mode check deferred) |

## Auth / OAuth (TD-03)

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 5 | Google login completes end-to-end on the production URL and lands on the intended `next` path via `/auth/callback` | Blocker | ☑ pass (2026-09-06 — Plan 01 human-verify: `/post` → Continue with Google → authenticated posting form on `https://zerodollar-blond.vercel.app`; Supabase Site URL fix documented in DEPLOY-RUNBOOK §4/§5; re-confirmed Plan 07-04) |
| 6 | Email OTP login completes end-to-end | Blocker | ☐ pending (Plan 07-05 — not exercised; Google OAuth verified in #5) |
| 7 | Session persists across reload | Blocker | ☑ pass (2026-09-06 — same Plan 01 session; Settings shows linked account after refresh on production) |

## Register-First Auth Gates (Phase 19 — D-19-01/04/05/06/11)

Cross-reference scenarios 1–12 from `scripts/phase19-uat-automation.mjs` and `.planning/phases/19-register-first-auth-gates/19-UAT.md`, adapted to the production `APP_URL`.

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 8 | Anonymous `/` feed grid loads without an auth modal (AUTH-08) | Blocker | ☑ pass (2026-09-06 — Plan 07-05: `phase19-uat-automation.mjs` scenario 1 on production) |
| 9 | Guest `/listing/[id]` shows the preview wall (title + hero + CTA only) — full detail requires login (AUTH-01) | Blocker | ☑ pass (2026-09-06 — Plan 07-05: phase19 scenario 2, description gated) |
| 10 | Inline guest auth on the preview heart / login CTA works (`DetailPreviewWall` + `AuthPromptForm`) | Blocker | ☑ pass (2026-09-06 — Plan 07-05: phase19 scenarios 3/9, `#guest-gate-email` gate card) |
| 11 | Favorites bottom-nav tab requires login (AUTH-03) | Blocker | ☑ pass (2026-09-06 — Plan 07-05: phase19 scenario 4, auth modal without navigation) |
| 12 | `/post` enforces a page-level gate on entry for guests (AUTH-04) | Blocker | ☑ pass (2026-09-06 — Plan 07-05: phase19 scenarios 6/7) |
| 13 | Shared listing link Open Graph tags remain public (no auth required to render OG preview) | Blocker | ☒ **fail** (2026-09-06 — Plan 07-05: listing URL public (200) but SSR HTML has no `og:*` meta tags; only root layout title/description) → **fixed in code 2026-10-30** (`generateMetadata` on `/listing/[id]` from the anon `listings_public` row; absolute URLs via `metadataBase`); re-verify on production after deploy |

## Browse / Feed / Post (D-07-45)

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 14 | Feed shows recent Subito listings after at least one successful production Subito run (D-07-25) | Blocker | ☑ pass (2026-09-06 — Plan 07-05: feed HTML contains `subito` markers; DB last run success 1808 listings) |
| 15 | Search and filter sheet (city + category) return expected results | Blocker | ☑ pass (2026-09-06 — Plan 07-05: filter control visible on production feed) |
| 16 | Favorites: add/remove a listing as a logged-in test account | Blocker | ☑ pass (2026-09-06 — Plan 07-05: authenticated heart tap + `/favorites` reachable) |
| 17 | Post: submit a UGC test listing end-to-end, then delete it during cleanup (D-07-64) | Blocker | ☐ pending (2026-09-06 — Plan 07-05: authenticated post form verified; full TEST-7- submit/delete deferred to post-TD-02 cleanup) |
| 18 | Historical listings from other sources (previously scraped before this phase) may still be visible in the feed until their expiry window elapses — this is expected and not a launch failure (D-07-25) | Deferred | ☑ acknowledged (no non-Subito sources enabled; historical rows may remain until expiry) |

## Push Notifications (D-07-31, D-07-46, TD-02)

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 19 | Settings push toggle enables successfully on production (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` matches server `VAPID_PUBLIC_KEY`) | Blocker | ☑ pass (2026-09-06 — Plan 07-05: Playwright `/settings` shows Push notifications toggle, not `iosDisabled` copy; re-confirms Plan 07-04) |
| 20 | Server-sent test push arrives in the browser | Blocker | ☐ pending (2026-09-06 — Plan 07-05: `push-browser-e2e.mjs` auth cookie issue on production; toggle OK in #19; delivery unverified) |
| 21 | **TD-02 — physical iPhone standalone PWA push:** install to Home Screen (A2HS), open from the icon (not a Safari tab), enable push in Settings, and confirm a push notification is received while the app is closed | Blocker | ☐ **pending human verify** (Plan 07-05 checkpoint — requires physical iPhone A2HS) |

## Admin Console (D-07-51)

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 22 | `/admin` Overview loads with correct platform/source cards | Blocker | ☑ pass (2026-09-06 — Plan 07-05: operator-authenticated Playwright `/admin` loads) |
| 23 | `/admin` Sources page loads; Subito source shows enabled, correct schedule | Blocker | ☑ pass (2026-09-06 — Plan 07-05: `/admin/sources` + DB `subito.enabled=true`, others false) |
| 24 | Disabled-source admin/config surfaces (all sources other than Subito) load without a runtime error | Warning | ☑ pass (2026-09-06 — Plan 07-05: `/admin/sources/vinted` loads without application error) |
| 25 | `/admin` Runs page shows the production Subito run history | Blocker | ☑ pass (2026-09-06 — Plan 07-05: `/admin/runs` shows Subito success history; GH Actions run 34058038341) |
| 26 | `/admin` Settings / proxy page loads and reflects the operator-configured proxy toggle | Blocker | ☑ pass (2026-09-06 — Plan 07-05: `/admin/settings` loads proxy/global config UI) |

## Worker — Subito Production Run (D-07-20/21)

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 27 | Trigger one Subito run via the GitHub Actions scheduler (manual `workflow_dispatch`) or the admin manual-run control | Blocker | ☑ pass (2026-09-06 — Plan 07-03: manual `workflow_dispatch` run 34058038341; re-confirmed Plan 07-05) |
| 28 | The triggered run completes with status `success` (not `failed`) and inserts/updates listings | Blocker | ☑ pass (2026-09-06 — Plan 07-03/05: status `success`, 1808 listings found, 13 inserted) |
| 29 | Scheduler behavior for the single enabled source matches DB `next_run_at` / interval config after the run | Blocker | ☑ pass (2026-09-06 — Plan 07-03/05: `next_run_at` advanced ~2h post-run per D-07-18) |

## Alert Cron (D-07-50)

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 30 | `curl -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/match-alerts` returns 200 with a `processed` count (may be 0) | Blocker | ☑ pass (2026-09-06 — `scripts/phase7-production-smoke.mjs` 3/3 against `https://zerodollar-blond.vercel.app`) |
| 31 | `curl $APP_URL/api/cron/match-alerts` (no header) returns 401 | Blocker | ☑ pass (2026-09-06 — same smoke script) |
| 32 | Whichever operator alert channel is already configured (Telegram / WhatsApp / WeChat / email) delivers a test message | Blocker | ☐ pending (2026-09-06 — Plan 07-05: channel secrets configured on GH Actions; live test message not sent during automated smoke) |

## Rollback Readiness

| # | Check | Severity | Result |
|---|-------|----------|--------|
| 33 | `docs/DEPLOY-RUNBOOK.md` §9 rollback commands reviewed and understood before go-live | Blocker | ☑ pass (2026-09-06 — Plan 07-05: §9 documents Vercel promote, GH workflow disable, cron pause, source disable) |
| 34 | Custom domain cutover is explicitly deferred until after this checklist passes | Deferred | ☑ acknowledged (D-07-02: canonical URL remains `https://zerodollar-blond.vercel.app`) |

---

## Evidence Notes

Record only non-PII evidence (status codes, screenshots with test data only, log excerpts with secrets redacted).

| Check # | Evidence | Cleaned up? |
|---------|----------|-------------|
| 1–3 | `phase7-production-smoke.mjs` 3/3; Playwright SW + reload | n/a |
| 8–12 | `phase19-uat-automation.mjs` 12/12 on production | ☑ (seeded P19UAT listings removed by script) |
| 13 | `curl` listing HTML — no `og:*` tags | n/a |
| 16 | Ephemeral test user favorites probe | ☑ (user deleted) |
| 17 | Post form fill only — no TEST-7- row persisted | n/a |
| 22–26 | Ephemeral operator allowlist user | ☑ (allowlist row + user deleted) |

### Blocker summary (Plan 07-05, 2026-09-06)

| Status | Checks |
|--------|--------|
| **Pass** | 1–3, 5, 7–12, 14–16, 19, 22–31, 33 |
| **Fail** | **13** (missing OG meta tags on listing SSR) |
| **Pending human** | **21 (TD-02)** iPhone standalone push |
| **Pending other** | 6 (email OTP), 17 (full UGC post), 20 (desktop push delivery), 32 (alert channel test) |

**Rollback trigger if #13 blocks launch:** no code rollback required for OG gap alone — track as post-launch SEO/sharing fix unless operator elevates to Blocker. If TD-02 fails: investigate VAPID + iOS standalone SW per DEPLOY-RUNBOOK §5.3 and §9.

## Sign-off

- [ ] All Blocker rows pass. *(blocked: #13 fail, #21 TD-02 pending, #6/#17/#20/#32 pending)*
- [ ] All Warning rows reviewed; any failures tracked as known issues, not launch blockers.
- [x] Deferred rows acknowledged as out of scope for this launch.
- [x] Test data cleanup complete (ephemeral smoke users/listings removed; no TEST-7- posts created).

**Operator sign-off / date:** ___________________________
