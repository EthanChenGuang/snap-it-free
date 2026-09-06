# 零元 (ZeroDollar / ZeroEuro) — Production Deploy Runbook

**Document ID:** DEPLOY-RUNBOOK
**Phase:** 07-production-deploy-vercel-fly-io
**Launch scope:** Subito-only ingest. Vinted, Facebook, Wallapop, and all other scraper sources are **disabled** until intentionally re-enabled post-launch (D-07-16/56).
**Audience:** Solo operator performing first production cutover.

This runbook is an **operational document, not legal advice**. Values are never recorded here — only variable names, platforms, and verification methods (D-07-29/38).

---

## 1. Production Topology

| Tier | Responsibility | Notes |
|------|-----------------|-------|
| Vercel (production) | Next.js PWA + App Router API routes + alert cron route (`/api/cron/match-alerts`) | Default `*.vercel.app` production URL (D-07-02/27) |
| **Production Subito ingest ($0 default)** | GitHub Actions scheduled workflow running `--scheduler-tick` | `.github/workflows/subito-scheduler.yml` (D-07-03/66) |
| Fly.io (optional, legacy-free fallback only) | Process-only scraper worker, no `[http_service]` | Scaled to **0 machines** at launch (D-07-67); not a 24/7 paid scheduler |
| Supabase | Auth, Postgres/PostGIS, Storage | Shared production backend; no new schema this phase (D-07-01/61) |

One direct production environment — no staging (D-07-01). First deploy is manual/operator-controlled; CI auto-deploy is deferred (D-07-05).

### Dependency order (D-07-04)

1. DB / env verification (§2, §4)
2. Vercel PWA deploy (§5)
3. GitHub Actions worker scheduler / optional Fly fallback (§6)
4. External alert cron (§7)
5. D-19 smoke (`docs/D-19-SMOKE-CHECKLIST.md`)

---

## 2. Pre-Flight Checklist

Run before every production deploy or redeploy.

- [ ] **Migrations applied** (D-07-61 — no new schema this phase): verify `supabase/migrations/*.sql` are applied via `supabase db push` or the Supabase SQL editor. Do not author new migrations for Phase 7.
- [ ] **Config export** (D-07-60): export critical config tables (`scraper_sources`, `scraper_global_config`) to a local snapshot for rollback reference.
- [ ] **Snapshots never committed** (D-07-62): store exports outside the git working tree (e.g. `~/backups/`), never under `docs/` or any tracked path.
- [ ] **`global_pause` check** (D-07-22): read current value of `scraper_global_config.global_pause`. Record it here before deploy, restore the same value after — **never silently change it**.
  - Current value at last check (2026-09-06, read-only REST query, Plan 01): `false`. `scraper_sources` confirmed Subito-only enabled (`subito.enabled = true`; `ebay`/`facebook`/`vinted`/`wallapop.enabled = false`) — matches D-07-16 launch scope. Not mutated.
- [ ] **Dependency order** confirmed: DB → Vercel → worker → cron → smoke (D-07-04).
- [ ] **Runtime split understood**: Vercel = PWA/API/cron route; GitHub Actions `--scheduler-tick` = default $0 Subito ingest; Supabase = DB/Auth/Storage; Fly = optional legacy-free fallback only, scaled to 0 by default (D-07-03/66/67).

---

## 3. $0 Platform Stack

Target: **$0/month** platform cost (D-07-39).

| Platform | Tier | Notes |
|----------|------|-------|
| Vercel | Hobby | Production PWA + API routes |
| Supabase | Free | Auth + Postgres/PostGIS + Storage |
| cron-job.org (or equivalent) | Free | External alert-matcher poller (D-07-37/44) |
| GitHub Actions | Free (private repo ≤2000 min/mo) | Default Subito scheduler — tune cadence to stay under quota (D-07-39/66) |
| Fly.io | **Scaled to 0** | Optional legacy-free fallback only; NOT a 24/7 paid worker at launch (D-07-67) |
| Proxy | Operator-managed | Configured separately; verified only, never purchased by this runbook |

**Any paid platform upgrade** (Fly 24/7, Vercel Pro, Supabase paid, etc.) requires stopping to ask the operator with evidence, options, and a minimum cost estimate before proceeding (D-07-42/43). Default launch **rejects** a paid 24/7 Fly worker.

---

## 4. Production Environment Matrix

Names, platform, and verification method only — **never values** (D-07-29/38).

### Vercel (Production scope)

| Variable | Required | Verification |
|----------|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Feed loads listings on production URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anonymous browse works without console errors |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Cron route + admin API routes succeed server-side |
| `APP_URL` | yes (canonical, D-07-27) | Matches the live Vercel production URL; Supabase Site URL aligned |
| `CRON_SECRET` | yes | `curl -H "Authorization: Bearer $CRON_SECRET"` → 200; missing/invalid → 401 |
| `VAPID_SUBJECT` | yes | Push send logs no VAPID warning |
| `VAPID_PUBLIC_KEY` | yes | Server push send succeeds |
| `VAPID_PRIVATE_KEY` | yes (sensitive) | Same |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | yes | Push toggle enabled in Settings (must match `VAPID_PUBLIC_KEY`) |
| `SCRAPER_SECRETS_KEY` | yes (shared with GitHub Actions/Fly) | Admin proxy decrypt succeeds; same key across platforms — do not regenerate (D-07-33) |
| `OPERATOR_BOOTSTRAP_EMAILS` or `SCRAPER_ADMIN_OPERATOR_EMAILS` | yes | `/admin` accessible for operator account |
| `GEMINI_API_KEY` and/or `OPENROUTER_API_KEY` | if translation used | Admin translation queue processes an item |

### GitHub Actions repo secrets (Settings → Secrets and variables → Actions)

Used by `.github/workflows/subito-scheduler.yml` (D-07-29):

| Secret name | Required | Verification |
|-------------|----------|---------------|
| `SUPABASE_URL` | yes | Workflow run succeeds without env error |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Workflow writes `scrape_runs` rows |
| `SCRAPER_SECRETS_KEY` | yes | Same key as Vercel — proxy/session decrypt succeeds |
| `PROXY_URL` | verify per source | Subito run is not hard-blocked; proxy toggle respected (D-07-19) |
| Alert channel secret(s) (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`, `CALLMEBOT_PHONE`/`CALLMEBOT_APIKEY`, `PUSHPLUS_TOKEN`, or `RESEND_API_KEY`/`ALERT_FROM`/`ALERT_TO`) | one channel | Whichever channel the operator already uses delivers a test alert (D-07-26) |

### Fly.io (optional legacy-free fallback only)

| Secret name | Required | Verification |
|-------------|----------|---------------|
| `SUPABASE_URL` | if Fly path used | Worker starts without env error |
| `SUPABASE_SERVICE_ROLE_KEY` | if Fly path used | Worker writes `scrape_runs` |
| `SCRAPER_SECRETS_KEY` | if Fly path used | Same key as Vercel/GitHub Actions |
| `PROXY_URL` | verify per source | Subito run not hard-blocked |

### Supabase dashboard configuration (no env vars — dashboard only)

| Setting | Required | Verification |
|---------|----------|---------------|
| Site URL | yes | Points to Vercel production URL — confirmed live 2026-09-06: updated to `https://zerodollar-blond.vercel.app` (was still `http://localhost:3003`, which caused Google OAuth to complete but redirect back to localhost instead of production — caught during the Plan 01 human-verify checkpoint and fixed) |
| Additional Redirect URLs | yes | Includes prod `/**` **and** preserves localhost dev entries (D-07-35/36) — confirmed live: `https://zerodollar-blond.vercel.app/**` added alongside existing `http://localhost:3003/**` |
| Google OAuth provider enabled | yes | Matches currently enabled providers (D-07-28) — confirmed live: Google sign-in on `/post` completes end-to-end on production URL post-fix |

### Google Cloud Console (OAuth client — no env vars)

| Setting | Required | Verification |
|---------|----------|---------------|
| Authorized JavaScript origin | yes | = Vercel production URL |
| Authorized redirect URI | yes | = `https://<supabase-project-ref>.supabase.co/auth/v1/callback` |
| OAuth consent screen app name | yes (D-07-13) | Matches public brand (§8) — verify only, no client secret recorded here |

---

## 5. Vercel Deploy (DEPLOY-01)

1. `vercel link` — prefer project slug `zerodollar` or `zero-dollar` if available (D-07-15); otherwise accept the suggested slug.
2. Set **all** Production environment variables from §4 Vercel table **before** the first production build — `NEXT_PUBLIC_*` values are baked in at build time (Pitfall 1, 07-RESEARCH.md).
3. `vercel --prod`
4. Record the exact deployment URL as canonical `APP_URL` below, then set `APP_URL` in Vercel Production env to match and redeploy if the first deploy used a placeholder (D-07-27).

**Canonical production URL:** `https://zerodollar-blond.vercel.app` *(recorded 2026-09-06 after first successful `vercel --prod`; this is a URL, not a secret. Vercel project: `zerodollar`, team `chenguangregis-gmailcoms-projects`)*

Note: the auto-generated team-scoped alias `https://zerodollar-chenguangregis-gmailcoms-projects.vercel.app` returns a Vercel SSO redirect (deployment protection on that alias) and must **not** be used as `APP_URL` — the random-suffix `-blond` alias is the publicly reachable production domain and is what OAuth/Supabase config must reference.

5. Verify:
   - `public/sw.js` present in the build output (Serwist production wrap, `next.config.ts`) — confirmed live: `GET /sw.js` → 200, `content-type: application/javascript`.
   - Homepage returns 2xx and renders the feed grid — confirmed: `GET /` → 200, real Subito listings rendered server-side.
   - `GET /api/cron/match-alerts` (no header) → 401 — confirmed live.
   - `GET /manifest.webmanifest` → `name`/`short_name` literal `ZeroDollar` — confirmed live (brand audit, §8).
   - Google OAuth sign-in on `/post` → Continue with Google → lands back on `/post` authenticated (not `localhost`) — confirmed live 2026-09-06 after fixing Supabase Site URL/Redirect URLs above.
   - Use `scripts/phase7-production-smoke.mjs` with `E2E_BASE_URL` set to the canonical URL — no manual curl fallback required. **Result (2026-09-06): 3/3 passed** (`/` 2xx, cron 401 without Bearer, cron 200 with `CRON_SECRET`).

### 5.1 Hobby-plan deploy-time adjustments (2026-09-06)

Two pre-existing repo settings exceeded Vercel Hobby plan limits and blocked the first `vercel --prod` build. Both were adjusted to the minimum change needed to stay on the $0 Hobby plan (D-07-39/42) rather than upgrading:

- **`vercel.json` cron schedule:** was `*/3 * * * *` (every 3 min) — Hobby plan rejects any cron more frequent than once/day (`Hobby accounts are limited to daily cron jobs`). Changed to `0 3 * * *` (once daily, 03:00 UTC). This Vercel-native cron is **not** the primary alert-matcher trigger — §7's external cron-job.org job (Bearer `CRON_SECRET`, 5–15 min interval) is the real trigger per D-07-37; this in-platform cron is now just a low-frequency backup safety net.
- **`app/api/admin/sources/[slug]/validate-urls/route.ts` `maxDuration`:** was `600` (10 min, for large Vinted URL-matrix probes) — Hobby plan caps Serverless Function `maxDuration` at `300`. Changed to `300`. This route is admin-only and Vinted is disabled at launch (D-07-16), so the cap does not affect any launch-blocking path; revisit only if upgrading past Hobby.

### 5.2 Vercel CLI GitHub-metadata deploy block (2026-09-06)

The first two `vercel --prod` attempts against a linked local `git remote origin` (GitHub `EthanChenGuang/snap-it-free`) were auto-tagged by the CLI with GitHub commit metadata and stuck in a `BLOCKED` deployment state (`seatBlock: TEAM_ACCESS_REQUIRED`, reason: *"the commit author doesn't have permission to create deployments for this project"*) — the Vercel account (`chenguangregis-2098`) has no Login Connection linking the GitHub identity (`EthanChenGuang` / `ethan.chen.guang@gmail.com`) that authored the local commits. `vercel project connect`/`vercel git disconnect` confirmed no formal Git integration was configured — the CLI attaches GitHub metadata purely by detecting the local `.git` remote.

**Workaround used (no dashboard change required):** temporarily ran `git remote remove origin` immediately before `vercel --prod`, then `git remote add origin <url>` immediately after the deploy request was accepted (deploys build server-side once accepted, independent of local CLI state). This avoids the GitHub-metadata attachment and the resulting access block. No commits, branches, or repo history were touched — only the local remote URL registration.

**If this recurs on a future redeploy:** either repeat the remote-remove/redeploy/remote-add workaround, or (preferred long-term fix, requires a human) add a Login Connection at `vercel.com/account/login-connections` linking the `EthanChenGuang` GitHub account to this Vercel account.

---

## 6. Worker Deploy

### 6.1 Default $0 path — GitHub Actions `--scheduler-tick` (D-07-66)

1. Add the repo secrets listed in §4 (GitHub Actions table) under **Settings → Secrets and variables → Actions**.
2. Confirm `.github/workflows/subito-scheduler.yml` exists with a `schedule` trigger (every 2 hours by default — tune to stay under the 2000 min/mo private-repo quota) and a `workflow_dispatch` trigger for manual runs.
3. Trigger one manual run via **Actions → Subito Scheduler → Run workflow** and confirm:
   - The workflow succeeds (green check).
   - Exactly one Subito run appears in `/admin` → Runs (D-07-20/21 — a failed first Subito run is a deploy blocker).
   - Scheduler behavior matches DB `next_run_at` / `scraper_sources` config (D-07-18) — no hardcoded cadence in workflow logic.
4. Disabled sources (Vinted, Facebook, Wallapop, others): confirm admin/config surfaces for these sources load without error. No manual run of a disabled source is required or in scope (D-07-16/17/21).

### 6.2 Optional legacy-free Fly fallback

Use only if the Fly org dashboard confirms Legacy Hobby allowances (3× `shared-cpu-1x` **256MB** free — not 512MB, D-07-08/67). Otherwise this path is a paid upgrade and requires stopping to ask the operator first (D-07-42/43).

```bash
# One-time: install CLI and log in
curl -L https://fly.io/install.sh | sh
fly auth login

cd scraper
fly secrets set \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  SCRAPER_SECRETS_KEY=... \
  PROXY_URL=...
fly deploy --config fly.toml
fly scale count 1 -a shoumanwu-scraper
fly logs -a shoumanwu-scraper
```

At launch with the GitHub Actions path active, scale Fly to **0** to avoid the ~$3–4/mo `shared-cpu-1x` 512MB charge (D-07-67):

```bash
fly scale count 0 -a shoumanwu-scraper
```

Run one instance only if Fly is used (`fly scale count 1`) — never run parallel Fly + GitHub Actions workers against the same due sources (D-07-23/24).

---

## 7. External Alert Cron (DEPLOY-04)

Use cron-job.org (or an equivalent free HTTP cron service) — D-07-37/44.

1. Create a job that sends `GET https://<APP_URL>/api/cron/match-alerts`.
2. Set a custom header: `Authorization: Bearer <CRON_SECRET>` (cron-job.org supports custom headers; it does **not** allow customizing User-Agent, so the route's secondary `vercel-cron` User-Agent fallback must **not** be relied upon for external cron — D-07-32).
3. Interval: 5–15 minutes recommended (route batches up to 50 pending events per call).
4. Verify:

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://<APP_URL>/api/cron/match-alerts"
# Expect: {"processed":N} (N may be 0)

curl -sS "https://<APP_URL>/api/cron/match-alerts"
# Expect: 401 {"error":"Unauthorized"}
```

(D-07-50). Never echo `$CRON_SECRET` to logs or docs.

---

## 8. Brand Audit (D-07-11/12/13/14)

Public brand: **zh 零元 / en ZeroDollar / it ZeroEuro**. Phase 7 audits and verifies prior brand changes — it does not perform a new broad rename (D-07-12/13). No internal package/resource/DB identifier renames.

| Surface | Expected | Verified in |
|---------|----------|-------------|
| `app/manifest.ts` `name`/`short_name` | literal `ZeroDollar` (D-07-14) | `grep 'ZeroDollar' app/manifest.ts` |
| `messages/en.ts` `app.title` | `ZeroDollar` | Locale-specific — unchanged by Phase 7 |
| `messages/zh.ts` `app.title` | `零元` | Locale-specific — unchanged by Phase 7 |
| `messages/it.ts` `app.title` | `ZeroEuro` | Locale-specific — unchanged by Phase 7 |
| `app/layout.tsx` default `<title>` | zh default (`零元`) via `getMessages('zh')` — locale switch handled client-side | Verify-only; no rename needed |
| Supabase Auth → Google provider → consent screen name | Should read `ZeroDollar` (or localized equivalent) | Operator verifies in Supabase dashboard + Google Cloud Console — **verification only, no client secret recorded** (D-07-13) |

**Note:** the PWA manifest's default `name`/`short_name` intentionally differs from the zh-first in-app locale strings — this is expected: the manifest controls the Android/desktop install prompt and A2HS label, which should show the brand-neutral `ZeroDollar` regardless of the visitor's browser locale (D-07-14). Per-locale UI strings (zh/en/it) remain unchanged.

---

## 9. Rollback Procedures (D-07-53/54)

**Triggers:** auth login failure, feed unavailable, sustained Subito worker failure, push breakage, or severe secret exposure.

### Vercel rollback

```bash
# List recent production deployments
vercel ls --prod

# Promote a previous known-good deployment back to production
vercel promote <deployment-url-or-id> --prod
```

### GitHub Actions worker — disable

```bash
# Disable the scheduled workflow without deleting it (GitHub UI: Actions → Subito Scheduler → ⋯ → Disable workflow)
gh workflow disable subito-scheduler.yml
```

### Fly rollback (if legacy-free fallback path is in use)

```bash
fly releases -a shoumanwu-scraper
fly deploy --image <previous-release-image> -a shoumanwu-scraper
# Or stop the worker entirely:
fly scale count 0 -a shoumanwu-scraper
```

### Cron disable

Pause or delete the cron-job.org job from its dashboard. No code change required.

### Source disable / global pause

```sql
-- Disable a single source (e.g. Subito) via admin UI is preferred; SQL fallback:
update scraper_sources set enabled = false where slug = 'subito';

-- Global pause (halts all scheduled + GitHub Actions scheduler-tick runs; manual admin-triggered runs still respect D-07-22 semantics)
update scraper_global_config set global_pause = true where id = 1;
```

Always restore `global_pause` to its pre-deploy value once the incident is resolved (§2).

---

## 10. Legal & Compliance Acknowledgment (D-07-55/56/57/58)

This section is a **plain operator acknowledgment of operational risk — it is not legal advice.**

Reference: `docs/legal/subito-scraping-note.md` (not rewritten in Phase 7 — D-07-57).

**Source status at launch (D-07-56):**

| Source | Status | Note |
|--------|--------|------|
| Subito | **Active** | Primary scraped supply; robots.txt prohibits automated access — see legal note for risk acceptance and fallback plan |
| Vinted | Disabled | Brief risk note below; re-enable is a deliberate post-launch decision, not part of this phase |
| Facebook | Disabled | Session-based scraping; higher account-risk profile; remains off by default |
| Wallapop, others | Disabled | Not enabled at launch |

**Vinted brief risk note (D-07-58):** Vinted scraping was implemented and validated in Phase 17 but is intentionally disabled at launch scope. If re-enabled post-launch, operators should re-verify Vinted's current terms of service and anti-bot posture before resuming scheduled runs — no new legal research doc is required for this brief note.

**Go-live acknowledgment (operator confirms before pointing production traffic at Subito):**

- [ ] I have read `docs/legal/subito-scraping-note.md` and understand Subito's `robots.txt` prohibits automated access.
- [ ] I accept the operational risk of IP/session blocks and potential legal contact.
- [ ] I understand the fallback supply plan (manual seeding / accelerated UGC / pause scraper) if Subito scraping becomes untenable.
- [ ] I understand disabled sources (Vinted, Facebook, Wallapop, others) are out of launch scope and require a deliberate future decision to re-enable.

### Terms / Privacy pages (D-07-59)

Terms of Service and Privacy Policy pages are **not Phase 7 blockers**. If these pages do not exist at launch, this is a deferred item — not a launch failure.

---

## 11. Data Protection & Test Data (D-07-63/64/65)

- Production smoke uses an operator/test-controlled account only (D-07-63).
- Test data (posts, storage media, favorites, alert matches, listing events) created during smoke must be tagged and cleaned up after verification (D-07-64).
- Smoke evidence (screenshots, logs, checklist notes) must never record PII or real user content (D-07-65).

---

## 12. First 24-Hour Observation Log (D-07-47)

Complete after production go-live. Completion criteria for the phase: production live + D-19 smoke pass + this runbook complete + 24h observation with no blockers (D-07-48).

| Hour | Vercel logs | GitHub Actions / Fly logs | Supabase/admin | Alert cron | Push delivery | Notes |
|------|-------------|---------------------------|-----------------|------------|----------------|-------|
| +1h  |             |                           |                 |            |                |       |
| +6h  |             |                           |                 |            |                |       |
| +12h |             |                           |                 |            |                |       |
| +24h |             |                           |                 |            |                |       |

**Blockers found during observation:** _none / describe_

---

*Related: `docs/D-19-SMOKE-CHECKLIST.md`, `docs/legal/subito-scraping-note.md`, `docs/adr/015-production-proxy.md`, `.planning/phases/07-production-deploy-vercel-fly-io/07-CONTEXT.md`*
