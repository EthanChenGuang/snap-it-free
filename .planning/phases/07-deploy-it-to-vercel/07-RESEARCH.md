# Phase 7: deploy it to Vercel - Research

**Researched:** 2026-08-04 (force refresh)
**Domain:** Vercel Hobby Next.js PWA deploy, external alert cron, Fly.io Playwright worker, Supabase production auth
**Confidence:** HIGH

## Summary

Phase 7 ships the existing Next.js PWA to **Vercel Hobby (free)** and the **scraper worker** to **Fly.io (~$4–7/mo in `ams`)**, keeping Supabase as the managed cloud database (~$25/mo already budgeted). The codebase is deploy-ready: `package.json` runs `next build --webpack`, MapLibre worker copy runs on `postinstall`, Serwist builds the service worker in production, the cron route accepts `Authorization: Bearer $CRON_SECRET`, and `scraper/Dockerfile` is production-ready.

**Aug 2026 refresh — verified platform limits:**

| Limit | Hobby value | Source |
|-------|-------------|--------|
| Fast Data Transfer (bandwidth) | **100 GB/mo** | [CITED: vercel.com/docs/limits] |
| Cron jobs per project | **100** (but daily-only) | [CITED: vercel.com/docs/cron-jobs/usage-and-pricing] |
| Cron minimum interval | **Once per day**; sub-daily **fails deploy** | [CITED: vercel.com/docs/cron-jobs/usage-and-pricing] |
| Cron timing precision | Per-hour (±59 min) on Hobby | [CITED: vercel.com/docs/cron-jobs/usage-and-pricing] |
| Function invocations | **1M/mo** included (Fluid compute) | [CITED: vercel.com/docs/functions/usage-and-pricing] |
| Active CPU | **4 hours/mo** included | [CITED: vercel.com/docs/functions/usage-and-pricing] |
| Provisioned memory | **360 GB-hrs/mo** included | [CITED: vercel.com/docs/functions/usage-and-pricing] |
| Function max duration | **60s** (Hobby max) | [CITED: vercel.com/docs/limits] |

The **blocking deploy issue** remains: current `vercel.json` has `"schedule": "*/3 * * * *"` which **will fail Hobby deployment** [CITED: vercel.com/docs/cron-jobs/usage-and-pricing]. Fix: remove the `crons` array (or set `"crons": []`) before first deploy (D-15).

**Cost stack validated (Aug 2026 Fly pricing page):**

| Component | Choice | Verified cost |
|-----------|--------|---------------|
| Next.js PWA | Vercel Hobby | **$0** |
| Alert cron | cron-job.org (preferred) or pg_cron | **$0** |
| Scraper worker | Fly.io shared-cpu-1x **512MB `ams`** | **$3.99/mo** [CITED: fly.io/docs/about/pricing] |
| Scraper worker (OOM fallback) | Fly.io shared-cpu-1x **1GB `ams`** | **$7.12/mo** [CITED: fly.io/docs/about/pricing] |
| **Incremental total** | | **~$4–7/mo** |

Note: D-02 cited ~$3.19/mo for 512MB — that is **`iad` (Ashburn)** pricing. **`ams` (Amsterdam)**, chosen for Venice proximity, is **$3.99/mo** at 512MB and **$7.12/mo** at 1GB. D-21 target ~$3–6/mo still holds at 512MB; upsizing to 1GB in `ams` exceeds the upper bound slightly.

**External cron comparison (refresh finding):**

| Provider | 3-min interval | Custom `Authorization` header | Cost | Verdict |
|----------|----------------|--------------------------------|------|---------|
| **cron-job.org** | ✅ (up to 1/min) | ✅ | $0 | **Preferred** [CITED: cron-job.org] |
| **Supabase pg_cron + pg_net** | ✅ (`*/3 * * * *`) | ✅ via Vault secret | $0 (existing Supabase bill) | **Fallback** [CITED: supabase pg_net docs] |
| **GitHub Actions** | ❌ **5-min minimum** | ✅ | $0 | **Not suitable for 3-min** [CITED: docs.github.com/actions] |
| **Vercel Pro cron** | ✅ | ✅ (native) | +$20/mo | Last resort (D-15) |

**Primary recommendation:** Remove sub-daily `vercel.json` crons → deploy Vercel Hobby with full production env → configure **cron-job.org** every 3 min → deploy Fly.io 512MB worker in `ams` (no `http_service`) → run D-19 smoke checklist → instant rollback drill.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Deployment Scope (What Ships Where)
- **D-01:** **Vercel Hobby (free) hosts the Next.js app only** — repo root, default framework preset, no monorepo subfolder — **Reversibility:** reversible.
- **D-02:** **Scraper worker deploys separately** via existing `scraper/Dockerfile` on **Fly.io shared-cpu-1x 512MB** (~$3.19/mo always-on; bump to 1GB ~$5.70/mo only if Playwright OOMs in smoke test) — **not** Vercel Serverless — **Reversibility:** costly — ops runbook + env duplication.
- **D-02b:** **Hetzner CX23 (~€3.99/mo, 4GB RAM)** is the **cheapest raw compute fallback** if Fly.io trial/credit limits block signup — accepts more Linux ops (Docker + systemd/Coolify) — **Reversibility:** costly.
- **D-03:** **Supabase project stays cloud-hosted** (existing project); Phase 7 configures production redirect URLs and verifies migrations applied — no Supabase self-host — **Reversibility:** one-way — production data anchor.
- **D-04:** **`scraper-admin/` Vite app is not deployed** — admin UI lives at `/admin` in Next.js per Phase 6 D-53 — **Reversibility:** reversible.

#### Domain & URL Strategy
- **D-05:** **v1 launch on Vercel default subdomain** (`https://<project-name>.vercel.app`) — custom domain deferred until post-validation — **Reversibility:** reversible — DNS add later without code changes if env uses `VERCEL_URL` pattern.
- **D-06:** Production canonical URL via env **`NEXT_PUBLIC_APP_URL`** (or equivalent) set to the stable production hostname — used for OAuth `redirectTo`, share links, and VAPID subject consistency — **Reversibility:** costly — touches auth callback and push config.
- **D-07:** **Supabase Auth redirect allowlist** must include `https://<production-host>/auth/callback` — add preview wildcard `https://*-*.vercel.app/auth/callback` only if preview OAuth testing is required (default: skip preview OAuth) — **Reversibility:** reversible.
- **D-08:** **Google OAuth** (and Apple when enabled) provider consoles updated with Supabase callback URL + production site URL — document in deploy checklist — **Reversibility:** reversible.

#### Environment Tiers & Secrets
- **D-09:** **Production environment** on Vercel gets the full secret set from `.env.example` / `.env.local.example`: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `VAPID_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `OPERATOR_BOOTSTRAP_EMAILS`, `SCRAPER_SECRETS_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, optional `TELEGRAM_*` / `RESEND_*` — **Reversibility:** one-way — live secrets in platform.
- **D-10:** **Preview deployments** get **public vars only** (`NEXT_PUBLIC_*`); server secrets omitted — OAuth and cron will not work on preview (acceptable for solo v1) — **Reversibility:** reversible.
- **D-11:** **Never commit** `.env.local` or production secrets to git — Vercel dashboard + Fly.io secrets only — **Reversibility:** one-way — security boundary.
- **D-12:** Scraper worker on Fly.io mirrors Supabase + service-role + proxy/alert env from `scraper/.env.example` — config for URLs/schedules comes from Supabase DB per Phase 6 D-18 — **Reversibility:** costly.

#### Vercel Build & Runtime
- **D-13:** Build command **`npm run build`** (already runs `next build --webpack` for MapLibre compatibility) — do not switch to Turbopack in production — **Reversibility:** reversible.
- **D-14:** Install command **`npm install`** — `postinstall` copies MapLibre worker (`scripts/copy-maplibre-worker.mjs`) — verify build succeeds on Vercel before marking deploy done — **Reversibility:** reversible.
- **D-15:** **Do NOT use Vercel Pro ($20/mo)** solely for cron — Hobby limits built-in cron to **once per day**, and current `vercel.json` `*/3 * * * *` **will fail Hobby deploy** — **Reversibility:** reversible.
- **D-15b:** **Alert matcher scheduling (cost-optimized, pick one):**
  - **Preferred:** Remove sub-daily entry from `vercel.json` crons; use **free external HTTP cron** (e.g. cron-job.org, GitHub Actions schedule, or Uptime Kuma) to `GET /api/cron/match-alerts` every 3 min with `Authorization: Bearer $CRON_SECRET` — route already supports this — **$0 extra**
  - **Alternative:** Supabase **`pg_cron` + `pg_net`** HTTP call to production URL (same pattern as migration 005 expiry job; keeps scheduling in existing Supabase bill) — **$0 extra**
  - **Last resort:** Vercel Pro only if external cron is unacceptable — **+$20/mo**
- **D-16:** **`CRON_SECRET`** required in Vercel production env regardless of scheduler choice — **Reversibility:** reversible.
- **D-17:** **Serwist service worker** builds in production (`disable` only in development per `next.config.ts`) — smoke-test push subscribe on deployed HTTPS URL — **Reversibility:** reversible.

#### Deploy Workflow & Verification
- **D-18:** **Git-connected auto-deploy** — push to `main` triggers production deploy (Vercel default) — **Reversibility:** reversible.
- **D-19:** **First-deploy smoke checklist:** (1) `/` map loads pins, (2) Google login completes round-trip, (3) cron route returns 200 with auth, (4) `/admin` gates non-operators, (5) Fly worker logs show successful scrape run — **Reversibility:** reversible.
- **D-20:** **Rollback** via Vercel instant rollback to previous deployment — no custom blue/green in v1 — **Reversibility:** reversible.

#### Cost Summary (locked for planning)
- **D-21:** Incremental monthly deploy stack target:

| Component | Choice | ~Cost/mo |
|-----------|--------|----------|
| Next.js PWA | Vercel Hobby | **$0** |
| Alert cron | External HTTP ping or Supabase pg_cron | **$0** |
| Scraper worker | Fly.io 512MB (or 1GB if needed) | **$3–6** |
| Database/auth | Supabase Pro (already planned) | **~$25** (existing) |
| Custom domain | Deferred | **$0** |
| **Incremental deploy total** | | **~$3–6** |

Avoid **Vercel Pro ($20)** and **Railway ($5 plan + usage)** unless free cron or Fly.io is blocked — saves **~$20/mo** vs prior CONTEXT draft.

### Claude's Discretion
User requested **most cost-effective** solution — D-15b external cron + Vercel Hobby + right-sized Fly.io supersede earlier Vercel Pro recommendation. Planner validates Playwright RAM in smoke test before upsizing Fly machine.

### Deferred Ideas (OUT OF SCOPE)
- **Custom domain** (e.g. `shoumanwu.it`) — post-validation; add DNS + Vercel domain config in a future quick task or phase
- **Preview-environment OAuth** — enable only if team grows; requires Supabase preview URL wildcards
- **GitHub Actions CI** beyond Vercel's built-in build — not needed for solo v1
- **Separate staging Supabase project** — costly; use local + production only
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| D-01 | Vercel Hobby hosts Next.js only | Recommended Approach step 2; Architectural Responsibility Map |
| D-02 | Fly.io 512MB worker, not Vercel serverless | Pattern 4 fly.toml; Fly pricing verified |
| D-02b | Hetzner fallback if Fly blocked | Discretion table; Environment Availability |
| D-03 | Supabase cloud, migrations applied | OAuth checklist; pg_cron reuse migration 005 |
| D-04 | No scraper-admin deploy | Out of scope confirmed |
| D-05 | Vercel default subdomain | Recommended Approach; Open Questions RESOLVED |
| D-06 | NEXT_PUBLIC_APP_URL canonical | Env var table; OAuth note on runtime origin |
| D-07 | Supabase redirect allowlist | Pattern 5 OAuth checklist |
| D-08 | Google OAuth console config | Pattern 5; OAuth Production Checklist section |
| D-09 | Full production env on Vercel | Standard Stack env table |
| D-10 | Preview public vars only | Pitfall 7; env table |
| D-11 | Secrets in dashboard only | Don't Hand-Roll; Fly secrets pattern |
| D-12 | Worker env mirrors scraper/.env.example | Fly Worker Secrets table |
| D-13 | npm run build (webpack) | Verified package.json |
| D-14 | npm install + postinstall | MapLibre pitfall; build verification |
| D-15 | No Vercel Pro for cron; fix vercel.json | Pitfall 1; vercel.json fix confirmed |
| D-15b | External cron preferred | Cron provider comparison; GHA 5-min gap flagged |
| D-16 | CRON_SECRET required | route.ts bearer auth verified |
| D-17 | Serwist SW on HTTPS | Pitfall 3; smoke checklist |
| D-18 | Git auto-deploy main | Recommended Approach step 6 |
| D-19 | Five-gate smoke checklist | Validation Architecture |
| D-20 | Instant rollback | Rollback procedure; NEW pitfall on auto-assignment |
| D-21 | ~$3–6/mo incremental | Cost table with verified Fly ams pricing |
</phase_requirements>

## Recommended Approach (cost-optimized stack per D-21)

Ship in this order — each step unblocks the next:

| Step | Action | Cost |
|------|--------|------|
| 1 | **Fix `vercel.json`** — delete the `crons` array entirely (or `"crons": []`) so Hobby deploy succeeds | $0 |
| 2 | **Connect repo to Vercel** — root directory, framework Next.js, build `npm run build`, install `npm install`, Node 20.x+ | $0 |
| 3 | **Set Vercel Production env vars** — full secret inventory (see Standard Stack); Preview gets `NEXT_PUBLIC_*` only (D-10) | $0 |
| 4 | **Configure Supabase Auth URLs** — Site URL = `https://<project>.vercel.app`; Redirect URLs = production callback + `http://localhost:3003/**` | $0 |
| 5 | **Configure Google OAuth console** — Authorized redirect URI = `https://<ref>.supabase.co/auth/v1/callback` | $0 |
| 6 | **Deploy production** — push to `main` or `vercel deploy --prod` | $0 |
| 7 | **External cron** — **cron-job.org** hits `GET https://<project>.vercel.app/api/cron/match-alerts` every 3 min with `Authorization: Bearer <CRON_SECRET>` | $0 |
| 8 | **Fly.io worker** — `cd scraper && fly launch --no-deploy`; 512MB `shared-cpu-1x`, region `ams`, **no `[http_service]`**; `fly secrets set`; `fly deploy` | ~$3.99/mo |
| 9 | **D-19 smoke checklist** — all five gates green | $0 |
| 10 | **Rollback drill** — confirm Instant Rollback works; **Undo Rollback** to restore auto-deploy (D-20) | $0 |

**Cron provider (planner discretion — refresh correction):** Prefer **cron-job.org** (D-15b). Do **not** use GitHub Actions for the 3-minute poller — official minimum is **5 minutes** [CITED: docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax]. If cron-job.org is blocked, use **Supabase pg_cron + pg_net** (supports `*/3 * * * *`). Accept GHA only if 5-minute polling is acceptable (degrades alert latency vs D-106 intent).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Next.js PWA hosting | CDN / Static + Frontend Server (Vercel) | — | Vercel serves SSR/API routes + static assets |
| Build (webpack, Serwist SW, MapLibre worker) | Vercel build pipeline | — | `postinstall` + `prebuild` run on install/build |
| Production env secrets | Vercel dashboard (Production scope) | — | Server-only keys never in git (D-11) |
| OAuth session exchange | Frontend Server (`app/auth/callback`) | Browser (OAuth redirect) | PKCE code exchange via `@supabase/ssr` cookies |
| Alert matcher cron trigger | External scheduler OR Database (pg_cron) | API route on Vercel | Hobby blocks Vercel-native sub-daily cron |
| Alert matching + push send | API / Backend (`/api/cron/match-alerts`) | Supabase (outbox read/write) | Existing Phase 4 route + `web-push` |
| Scraper ingest + scheduler | Fly.io background worker | Supabase (config + listings) | Playwright never on Vercel serverless (D-02) |
| Listing expiry housekeeping | Database (pg_cron, migration 005) | — | Already deployed pattern |
| Operator admin UI | Frontend Server (`/admin` in Next.js) | Supabase RLS + middleware | Not deployed separately (D-04) |
| Service worker / push display | Browser (Serwist SW on HTTPS) | — | Secure context required for PushManager |

## Standard Stack

### Core (already installed — no new packages)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Next.js | 16.2.12 (installed) | App Router PWA host | Project framework; `--webpack` required for MapLibre |
| Vercel Hobby | platform | Production hosting | $0; git auto-deploy (D-01, D-18) |
| `@serwist/next` + `serwist` | 9.5.12 | PWA service worker | Production SW build; disabled in dev |
| Fly.io Machines | platform | Scraper worker | Always-on Docker; ~$4/mo at 512MB `ams` [CITED: fly.io/docs/about/pricing] |
| Supabase cloud | existing | DB + Auth | No self-host (D-03) |
| cron-job.org | SaaS | 3-min alert poller | $0; up to 1/min; custom headers [CITED: cron-job.org] |

### Vercel Production Environment Variables

Set in Vercel Dashboard → Project → Settings → Environment Variables → **Production** only (unless noted):

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | yes | Public; push subscribe |
| `NEXT_PUBLIC_APP_URL` | yes | D-06: `https://<project>.vercel.app` |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only; cron + admin routes |
| `CRON_SECRET` | yes | `openssl rand -hex 32`; external cron bearer (D-16) |
| `VAPID_PUBLIC_KEY` | yes | Server push send |
| `VAPID_PRIVATE_KEY` | yes | Server push send |
| `VAPID_SUBJECT` | yes | `mailto:ops@example.com` or production URL |
| `OPERATOR_BOOTSTRAP_EMAILS` | yes | Comma-separated; migration 018 seed |
| `SCRAPER_SECRETS_KEY` | yes | Proxy encryption for admin |
| `GEMINI_API_KEY` | yes | Ingest translation |
| `OPENROUTER_API_KEY` | yes | Translation fallback |
| `OPENROUTER_FALLBACK_MODEL` | optional | Default in `.env.example` |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | optional | Operator alerts |
| `RESEND_API_KEY` / `ALERT_FROM` / `ALERT_TO` | optional | Email alert fallback |

**Preview scope:** `NEXT_PUBLIC_*` only (D-10). Omit all server secrets.

**Gap (07-01 Wave 0):** Root `.env.example` uses legacy `APP_URL` and lacks VAPID/CRON keys. Align with D-09 inventory before deploy docs.

### Fly.io Worker Secrets

From `scraper/.env.example` — set via `fly secrets set` (never in `fly.toml`):

| Variable | Required |
|----------|----------|
| `SUPABASE_URL` | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | yes |
| `PROXY_URL` | recommended (Subito anti-bot) |
| `CRON_ENABLED` | `true` (Dockerfile default) |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | optional |
| `RESEND_API_KEY` + `ALERT_FROM` + `ALERT_TO` | optional |

Worker reads scrape URLs/schedules from Supabase DB (Phase 6 D-18) — no redeploy needed for config changes.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cron-job.org (preferred) | Supabase pg_cron + pg_net | Keeps scheduling in DB; needs migration + Vault secret + pg_net enable |
| cron-job.org | GitHub Actions `*/5` | **5-min floor** — not true 3-min polling [CITED: docs.github.com] |
| Fly.io 512MB `ams` | Fly.io 512MB `iad` | Saves ~$0.80/mo; higher latency to Venice |
| Fly.io 512MB | Fly.io 1GB `ams` | +$3.13/mo; only if Playwright OOM in smoke |
| Fly.io | Hetzner CX23 (D-02b) | Cheaper RAM but manual Docker/systemd ops |
| Vercel Hobby | Vercel Pro | +$20/mo; only last resort for cron (D-15) |

**Installation:** No new npm packages. Install Fly CLI: `curl -L https://fly.io/install.sh | sh` [CITED: fly.io/docs/languages-and-frameworks/dockerfile].

## Package Legitimacy Audit

> No new external packages in this phase. Existing dependencies already installed and vetted in prior phases.

| Package | Verdict | Disposition |
|---------|---------|-------------|
| (none new) | — | N/A |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION (Phase 7)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Users (HTTPS) ──► Vercel Hobby ──► Next.js App (webpack build)       │
│                         │                    │                          │
│                         │                    ├── / (MapLibre map)       │
│                         │                    ├── /auth/callback (PKCE)  │
│                         │                    ├── /admin (operator gate) │
│                         │                    └── /api/* Route Handlers  │
│                         │                              │                │
│  cron-job.org ($0) ─────┼──► GET /api/cron/match-alerts                 │
│  (every 3 min)          │         Bearer CRON_SECRET                    │
│                         │              │                                │
│                         │              ▼                                │
│                         │         processPendingListingEvents         │
│                         │              │                                │
│                         │              ├──► alert_matches (in-app badge)│
│                         │              └──► web-push (VAPID)            │
│                         │                                               │
│                         ▼                                               │
│                    Supabase Cloud                                       │
│                    (Auth, Postgres, Storage)                            │
│                         ▲                                               │
│                         │                                               │
│  Fly.io worker ($4-7) ──┘  Playwright scrape → listings ingest         │
│  (always-on, no HTTP)     60s scheduler tick, DB config pull          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (deploy artifacts to add)

```
scraper/
├── Dockerfile          # existing — Playwright + Node 22
├── fly.toml            # NEW — background worker, no http_service, ams region
└── .env.example        # existing — secrets template for fly secrets set

vercel.json             # MODIFY — remove */3 cron (or empty crons array)

.planning/phases/07-deploy-it-to-vercel/
├── CRON-SETUP.md       # 07-02 — cron-job.org + pg_cron fallback
└── DEPLOY-RUNBOOK.md   # 07-04 — full operator runbook
```

### Pattern 1: Remove Hobby-Blocking Cron Before Deploy

**What:** Delete sub-daily Vercel cron; use external HTTP ping instead.
**When to use:** Always on Vercel Hobby (D-15).
**Fix confirmed:** Current repo `vercel.json` still has `*/3 * * * *` — must change before deploy.

```json
{
  "crons": []
}
```

Route auth unchanged — bearer secret works for external callers:

```typescript
// app/api/cron/match-alerts/route.ts — already supports external cron
if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
  return true;
}
```

### Pattern 2: External Cron (cron-job.org) — Preferred

**What:** Free SaaS scheduler hits production URL with bearer token.
**When to use:** D-15b preferred path — supports true 3-minute interval.

```
URL:      https://<project>.vercel.app/api/cron/match-alerts
Method:   GET
Schedule: */3 * * * *
Header:   Authorization: Bearer <CRON_SECRET>
Expected: 200 {"processed":N}
```

cron-job.org free tier: up to **60 executions/hour** (1/min), custom headers, failure notifications [CITED: cron-job.org].

### Pattern 3: Supabase pg_cron + pg_net (fallback)

**What:** DB-native HTTP GET on schedule; reuses `pg_cron` from migration 005.
**When to use:** If cron-job.org signup blocked.
**Requires:** Enable `pg_net` extension in Supabase Dashboard; store `CRON_SECRET` in Vault.

```sql
-- Source: [CITED: github.com/supabase/supabase pg_net guide]
select cron.schedule(
  'match-alerts-poller',
  '*/3 * * * *',
  $$
  select net.http_get(
    url := 'https://<project>.vercel.app/api/cron/match-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'
      )
    ),
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);
```

### Pattern 4: Fly.io Background Worker (no HTTP)

**What:** Deploy `scraper/Dockerfile` as process-only Machine — **omit `[http_service]`** entirely.
**When to use:** Always for scraper (D-02).
**Why no http_service:** Worker has no inbound traffic; proxy autostop does not apply to machines without `[http_service]` [CITED: fly.io/docs/blueprints/long-running-tasks].

**Example `scraper/fly.toml`:**

```toml
app = "shoumanwu-scraper"
primary_region = "ams"

[build]
  dockerfile = "Dockerfile"

[env]
  CRON_ENABLED = "true"

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"

kill_signal = "SIGTERM"
kill_timeout = "120s"
```

Deploy commands:

```bash
cd scraper
fly launch --no-deploy
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... PROXY_URL=...
fly deploy
fly scale count 1
fly logs
```

If OOM (exit 137): `fly scale memory 1024` → **$7.12/mo in `ams`** [CITED: fly.io/docs/about/pricing].

**Note:** `fly launch` may default to adding `[http_service]` on port 8080 — remove that section for background worker. Remote builder works without local Docker [CITED: fly.io/docs/languages-and-frameworks/dockerfile].

### Pattern 5: OAuth Production Checklist (Supabase + Google)

**When to use:** Steps 4–5 of Recommended Approach; before D-19 smoke (2).

| Step | Where | Setting | Value |
|------|-------|---------|-------|
| 1 | Supabase → URL Configuration | **Site URL** | `https://<project>.vercel.app` |
| 2 | Supabase → Redirect URLs | Allowlist | `https://<project>.vercel.app/auth/callback` |
| 3 | Supabase → Redirect URLs | Local dev | `http://localhost:3003/**` |
| 4 | Supabase → Auth → Providers | Google enabled | Client ID + secret from Google Console |
| 5 | Google Cloud Console → Credentials | **Authorized redirect URIs** | `https://<ref>.supabase.co/auth/v1/callback` |
| 6 | Google Cloud Console → Credentials | **Authorized JavaScript origins** | `https://<project>.vercel.app` |
| 7 | Vercel Production env | `NEXT_PUBLIC_APP_URL` | `https://<project>.vercel.app` |
| 8 | Verify | Auth logs | No `redirect_uri_mismatch` after test login |

**Important:** Google redirect URI points at **Supabase callback**, not app `/auth/callback`. App uses `window.location.origin` in `AuthPromptModal` for `redirectTo` — works on Vercel subdomain without code change [CITED: supabase.com/docs/guides/auth/redirect-urls].

**Preview OAuth (deferred per D-07):** If ever needed, add `https://*-.vercel.app/**` to Supabase allowlist [CITED: supabase.com/docs/guides/auth/redirect-urls].

### Anti-Patterns to Avoid

- **Keeping `*/3` in `vercel.json` on Hobby:** Deploy fails immediately.
- **GitHub Actions `*/3` for alert poller:** Platform enforces 5-minute minimum — use cron-job.org or pg_cron instead.
- **Deploying scraper to Vercel Serverless:** Playwright + long-running scheduler incompatible with 60s Hobby function limit.
- **Adding `[http_service]` to Fly worker:** Unnecessary public exposure; autostop complexity.
- **Copying secrets into git / fly.toml `[env]`:** Use Vercel dashboard + `fly secrets set` (D-11).
- **Testing push on `http://localhost`:** PushManager requires secure context (D-17).
- **Using Turbopack for production build:** Breaks MapLibre worker (D-13).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sub-daily cron on Hobby | Custom Vercel workaround | cron-job.org or pg_cron | Platform enforces daily limit at deploy |
| Playwright hosting | Vercel cron + serverless scrape | Fly.io Docker worker | Browser + long process exceeds serverless limits |
| Service worker build | Hand-rolled `public/sw.js` | `@serwist/next` (installed) | Precache, webpack integration already wired |
| OAuth token exchange | Custom JWT parsing | Supabase PKCE + `exchangeCodeForSession` | Already in `app/auth/callback/route.ts` |
| Cron auth | IP allowlist only | `CRON_SECRET` bearer (existing) | Works with any external caller |
| Worker config deploys | Redeploy on URL change | Supabase DB config pull (Phase 6) | Worker reads config each run |

**Key insight:** Phase 7 is **wiring and configuration**, not new application logic. Highest-risk work: platform config (env vars, auth URLs, cron removal) and Fly worker sizing.

## Common Pitfalls

### Pitfall 1: vercel.json Deploy Failure on Hobby

**What goes wrong:** Deploy rejected: *"Hobby accounts are limited to daily cron jobs. This cron expression would run more than once per day."*
**Why it happens:** Current `vercel.json` has `"schedule": "*/3 * * * *"`.
**How to avoid:** Remove crons array before first Hobby deploy (07-01 Wave 0).
**Warning signs:** Build succeeds locally but Vercel production deploy fails during validation.

### Pitfall 2: MapLibre Blank Map on Production

**What goes wrong:** Map style loads but no tiles render.
**Why it happens:** MapLibre worker not copied to `public/maplibre/`; webpack inlines `import.meta.url` as `file://`.
**How to avoid:** Ensure `npm install` runs on Vercel (triggers `postinstall`); verify `/maplibre/maplibre-gl-worker.mjs` returns 200.
**Warning signs:** Smoke check (1) fails — map shell visible, zero pins/tiles.

### Pitfall 3: Serwist SW / Push Failures

**What goes wrong:** Push subscribe fails; stale SW serves old assets.
**Why it happens:** Push requires HTTPS; SW only builds when `NODE_ENV !== 'development'`.
**How to avoid:** Test push only on `https://<project>.vercel.app`; verify `/sw.js` post-build.
**Warning signs:** `Notification.requestPermission` rejected.

### Pitfall 4: OAuth Redirect Mismatch

**What goes wrong:** Google login returns Supabase error or `auth=error`.
**Why it happens:** Supabase allowlist missing production callback; Google Console points to app URL instead of Supabase callback.
**How to avoid:** Follow Pattern 5 checklist before smoke test (2).
**Warning signs:** Supabase Auth logs show `redirect_uri_mismatch`.

### Pitfall 5: Fly.io Playwright OOM at 512MB

**What goes wrong:** Worker exits code 137; Chromium fails to launch.
**Why it happens:** Playwright + Node + Crawlee exceeds 512MB during scrape.
**How to avoid:** Start at 512MB; monitor first scrape in `fly logs`; upsize to 1GB only if OOM confirmed.
**Warning signs:** Smoke check (5) fails; logs show `Killed`.

### Pitfall 6: Instant Rollback Side Effects (NEW — Aug 2026)

**What goes wrong:** After rollback, new pushes to `main` don't auto-deploy; cron config from rolled-back deployment restored.
**Why it happens:** Instant Rollback disables auto-assignment of production domains until **Undo Rollback**; rolled-back deployment restores that deployment's `vercel.json` cron state [CITED: vercel.com/docs/instant-rollback].
**How to avoid:** After rollback drill, click **Undo Rollback** or `vercel promote`; external cron URL unchanged; env vars stay at project level.
**Warning signs:** Push to main succeeds but production URL unchanged.

### Pitfall 7: Hobby Git Organization Limit (NEW — Aug 2026)

**What goes wrong:** Cannot connect repo to Vercel Hobby project.
**Why it happens:** Vercel Hobby does not support Git repos owned by **Git organizations** — personal repos only [CITED: vercel.com/docs/limits].
**How to avoid:** Use personal GitHub account repo, create Vercel Team (paid), or deploy via `vercel deploy --prod` CLI without git integration.
**Warning signs:** Import fails with org-repo restriction message.

### Pitfall 8: GitHub Actions 5-Minute Floor (NEW — Aug 2026)

**What goes wrong:** Alert poller runs every ~5–9 min despite `*/3 * * * *` in workflow YAML.
**Why it happens:** GitHub Actions minimum schedule interval is **5 minutes** [CITED: docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax].
**How to avoid:** Use cron-job.org for true 3-min polling; or accept 5-min latency; or use pg_cron.
**Warning signs:** 07-02 CRON-SETUP or GHA example uses `*/3` — **plan gap to fix**.

### Pitfall 9: Preview Env Has No Secrets

**What goes wrong:** OAuth/cron debugging on preview deployments fails.
**Why it happens:** D-10 — Preview gets `NEXT_PUBLIC_*` only.
**How to avoid:** Test auth and cron on Production URL only.

## Pitfalls

Consolidated blocking issues for planner verification gates:

1. **`vercel.json` `*/3` cron → Hobby deploy hard-fail** — Wave 0 / 07-01.
2. **MapLibre `postinstall` on Vercel** — verify worker files in build output.
3. **Serwist requires HTTPS** — push smoke only on production URL.
4. **OAuth triple-config** — Supabase URLs + Google Console.
5. **Fly worker: no `[http_service]`** — use logs for smoke (5).
6. **`.env.example` incomplete** — VAPID/CRON/`NEXT_PUBLIC_APP_URL` missing; align in 07-01.
7. **GHA cannot do 3-min cron** — update 07-02 examples if GHA mentioned as equal alternative.
8. **Hobby Git org repo** — verify repo ownership before Wave 0.
9. **Rollback disables auto-deploy** — document Undo Rollback in 07-04 runbook.

## Discretion items for planner

| Item | Options | Recommendation | Rationale |
|------|---------|----------------|-----------|
| External cron provider | cron-job.org / pg_cron / GHA | **cron-job.org** | True 3-min interval; GHA min 5 min [CITED: docs.github.com] |
| Fly.io region | `ams` / `fra` / `iad` | **`ams` (Amsterdam)** | Closest Fly EU region to Venice; $3.99/mo at 512MB |
| Worker RAM | 512MB / 1GB | **512MB default** | D-02; upsize only after OOM ($7.12/mo in ams) |
| `NEXT_PUBLIC_APP_URL` vs `APP_URL` | D-06 naming | **`NEXT_PUBLIC_APP_URL`** | `.env.example` still has legacy `APP_URL` — fix in 07-01 |
| `.env.example` sync | Update now vs deploy task | **Update in Wave 0 (07-01)** | Reduces deploy mistakes |
| Preview OAuth wildcards | Add or skip | **Skip** (D-07 default) | Preview has no server secrets (D-10) |
| Hetzner fallback | Fly blocked → CX23 | **Document in runbook only** | D-02b; don't plan unless Fly signup fails |
| GHA as cron fallback | Accept 5-min vs reject | **Reject for primary path** | Degrades D-106 3-min intent; note in CRON-SETUP only |

## Code Examples

### External Cron Smoke Test

```bash
curl -sS -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://<project>.vercel.app/api/cron/match-alerts"
# Expect: 200
```

### Unauthorized Cron Must 401

```bash
curl -sS -w "\n%{http_code}\n" \
  "https://<project>.vercel.app/api/cron/match-alerts"
# Expect: 401
```

### Local Production Build Verification

```bash
npm install && npm run build
test -f public/maplibre/maplibre-gl-worker.mjs && echo "maplibre worker OK"
test -f public/sw.js && echo "serwist sw OK"
```

### GitHub Actions (5-min minimum — NOT for 3-min requirement)

```yaml
# Only if 5-minute polling is acceptable; NOT equivalent to D-106 */3 intent
name: Match alerts poller
on:
  schedule:
    - cron: '*/5 * * * *'  # minimum enforced by GitHub
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "https://<project>.vercel.app/api/cron/match-alerts"
```

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test && cd scraper && npm test` |

### Phase Deliverables → Test Map

| Deliverable | Behavior | Test Type | Automated Command | File Exists? |
|-------------|----------|-----------|-------------------|-------------|
| Hobby deploy succeeds | No sub-daily cron deploy error | build | `npm run build`; Vercel deploy log green | ✅ |
| MapLibre worker present | Worker files copied | build/smoke | `test -f public/maplibre/maplibre-gl-worker.mjs` after build | ✅ |
| Cron auth gate | 401 without secret; 200 with bearer | integration | `curl` against production URL | ✅ route |
| Cron matcher logic | processPendingListingEvents | unit | `npm run test:lib -- lib/alerts/process-events.test.ts` | ✅ |
| Serwist SW built | sw.js emitted | build | `test -f public/sw.js` after build | ✅ |
| OAuth callback | PKCE exchange | manual | D-19 smoke (2) | ❌ manual |
| Admin gate | Non-operator redirected | manual | D-19 smoke (4) | ❌ manual |
| Push subscribe | HTTPS + VAPID | manual | D-19 — Settings push toggle | ❌ manual |
| Fly worker scrape | DB ingest + logs | manual | D-19 smoke (5) — `fly logs` | ❌ manual |
| Scraper scheduler | 60s tick | unit | `cd scraper && npm test -- src/scheduler.test.ts` | ✅ |

### First-Deploy Smoke Checklist (D-19)

| # | Check | Pass Criteria | Command / Action |
|---|-------|---------------|------------------|
| 1 | Map loads pins | Venice map renders markers | Open `https://<project>.vercel.app/` |
| 2 | Google login | Round-trip to intended `next` path | Settings → Accedi → Google |
| 3 | Cron route | 200 + JSON `{processed:N}` | `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/match-alerts` |
| 4 | Admin gate | Non-operator → redirect `/` | Open `/admin` logged out or as non-operator |
| 5 | Worker scrape | `scrape_runs` row or success log | `fly logs -a shoumanwu-scraper` |

### Rollback Procedure (D-20)

1. Vercel Dashboard → Deployments → previous production → **Instant Rollback**
2. Re-run smoke checks 1, 2, 4
3. **Undo Rollback** (Dashboard or `vercel promote`) to restore auto-deploy on push
4. External cron unchanged; env vars at project level unaffected

### Sampling Rate

- **Per task commit:** `npm run build && npm test`
- **Per wave merge:** `npm test && cd scraper && npm test`
- **Phase gate:** D-19 smoke checklist all green + rollback drill with Undo Rollback

### Wave 0 Gaps

- [ ] Remove/fix `vercel.json` crons (Hobby blocker) — **07-01**
- [ ] Align `.env.example` with full production env (VAPID, CRON, NEXT_PUBLIC_APP_URL) — **07-01**
- [ ] Verify Git repo is personal account (not org) for Hobby — **07-01 checkpoint**
- [ ] Create `scraper/fly.toml` — **07-03**
- [ ] Install `flyctl` on operator machine — not installed in research environment
- [ ] Configure cron-job.org after first production URL known — **07-02**
- [ ] Fix 07-02 GHA `*/3` example if retained as secondary note — **plan gap from refresh**

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth PKCE; production redirect allowlist |
| V3 Session Management | yes | `@supabase/ssr` cookie session |
| V4 Access Control | yes | `/admin` middleware + `operator_allowlist` RLS |
| V5 Input Validation | yes | Existing Zod Route Handlers |
| V6 Cryptography | yes | VAPID keys via env; `SCRAPER_SECRETS_KEY` |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cron endpoint abuse | DoS | `CRON_SECRET` bearer gate (D-106) |
| Secret leakage via preview | Info Disclosure | Preview gets `NEXT_PUBLIC_*` only (D-10) |
| Service role key in browser | Info Disclosure | Server-only env; never `NEXT_PUBLIC_` prefix |
| OAuth redirect hijack | Spoofing | Supabase allowlist + `safeNextPath` |
| Worker env in git | Info Disclosure | `fly secrets set` only (D-11) |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Local build | ✓ | v23.10.0 | Vercel managed Node 20.x |
| npm | Install/build | ✓ | 11.4.2 | — |
| Vercel CLI | Optional deploy | ✓ | 48.1.6 | Git push auto-deploy (D-18) |
| flyctl | Worker deploy | ✗ | — | Install via fly.io/install.sh |
| Docker (local) | Local worker test | ✗ | — | Fly remote builder (default) |
| Supabase project | App + worker | ✓ (assumed) | cloud | Blocker if not provisioned |
| cron-job.org account | External cron | ? | free tier | pg_cron + pg_net |

**Missing dependencies with no fallback:**
- Supabase cloud project with migrations through 018 applied (D-03)
- Google OAuth credentials configured in Supabase

**Missing dependencies with fallback:**
- `flyctl` not installed → install before worker deploy
- cron-job.org blocked → Supabase pg_cron + pg_net
- Fly.io blocked → Hetzner CX23 (D-02b)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel Pro for `*/3` cron | External HTTP cron on Hobby | Phase 7 CONTEXT (D-15b) | Saves ~$20/mo |
| Vercel Cron auth via UA only | Bearer `CRON_SECRET` primary | Phase 4 D-106 | External cron compatible |
| GitHub Actions for 3-min cron | cron-job.org or pg_cron | Aug 2026 refresh | GHA 5-min floor documented |
| Fixed 90min scraper cron | DB-driven scheduler (60s tick) | Phase 6 | Worker deploy doesn't set scrape URLs |
| `next-pwa` | Serwist `@serwist/next` 9.x | Phase 4 | Requires `--webpack` build |

**Deprecated/outdated:**
- Sub-daily `vercel.json` cron on Hobby: platform rejects at deploy
- GHA `*/3 * * * *` for alert poller: not honored (5-min minimum)
- Turbopack production build: breaks MapLibre worker

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase project on Pro with migrations through 018 applied | Recommended Approach | Deploy succeeds but admin/auth/alerts break |
| A2 | Google OAuth configured in Supabase for local dev | OAuth checklist | Production login fails until console updated |
| A3 | cron-job.org free tier supports 3-min interval with custom headers | Discretion | Fall back to pg_cron |
| A4 | 512MB sufficient for Playwright Chromium scrape in `ams` | Fly sizing | Need 1GB ($7.12/mo) |
| A5 | Git repo is personal account (not GitHub org) | Pitfall 7 | Hobby import blocked |
| A6 | `flyctl` install succeeds on operator machine | Environment | Hetzner fallback (D-02b) |

## Open Questions (RESOLVED)

1. **Exact Vercel project name / production URL** — **RESOLVED at 07-01 tracer deploy:** URL is `https://<project-name>.vercel.app`; set `NEXT_PUBLIC_APP_URL` in Vercel Production immediately after first deploy (D-06).

2. **pg_net extension enabled?** — **RESOLVED: only if cron-job.org blocked.** Default path is cron-job.org (D-15b). Check Supabase Dashboard → Extensions only if cron-job.org signup fails.

3. **Vercel Hobby bandwidth still 100GB?** — **RESOLVED (Aug 2026):** Yes — Fast Data Transfer 100 GB/mo on Hobby [CITED: vercel.com/docs/limits]. Sufficient for solo v1 PWA; monitor in Vercel Usage dashboard.

4. **Fly.io 512MB pricing in `ams`?** — **RESOLVED (Aug 2026):** **$3.99/mo** shared-cpu-1x 512MB in Amsterdam; **$7.12/mo** at 1GB [CITED: fly.io/docs/about/pricing]. D-02 ~$3.19 figure is `iad` pricing — planner should document `ams` in cost table.

5. **GitHub Actions viable for 3-min cron?** — **RESOLVED: No.** Minimum interval is 5 minutes [CITED: docs.github.com]. Use cron-job.org or pg_cron. Update 07-02 plan examples accordingly.

6. **vercel.json `*/3` fix sufficient?** — **RESOLVED: Yes.** Remove crons array or set `"crons": []` before deploy. Route already supports external bearer auth. No code changes to `match-alerts/route.ts` required.

## Project Constraints (from .cursor/rules/)

- All user-facing UI MUST follow `.planning/google-stitch-ui-design/DESIGN.md` — Phase 7 is deploy-only; no UI changes unless smoke reveals breakage.
- Monochrome Stitch tokens if any deploy-status UI added (unlikely).
- Use `@theme` tokens from `app/globals.css` — not default shadcn themes.

## Sources

### Primary (HIGH confidence)
- [CITED: vercel.com/docs/cron-jobs/usage-and-pricing] — Hobby daily cron limit, 100 jobs/project, deploy failure on sub-daily
- [CITED: vercel.com/docs/limits] — 100 GB Fast Data Transfer, 60s function max, Hobby Git org restriction
- [CITED: vercel.com/docs/functions/usage-and-pricing] — Fluid compute Hobby allowances (4h CPU, 360 GB-hrs memory, 1M invocations)
- [CITED: vercel.com/docs/instant-rollback] — Rollback behavior, cron revert, auto-assignment disable
- [CITED: supabase.com/docs/guides/auth/redirect-urls] — Site URL, Vercel preview wildcards
- [CITED: fly.io/docs/about/pricing] — shared-cpu-1x pricing by region (ams $3.99/512MB, $7.12/1GB)
- [CITED: fly.io/docs/blueprints/long-running-tasks] — Background worker without http_service
- [CITED: fly.io/docs/languages-and-frameworks/dockerfile] — fly launch, secrets, remote builder
- [CITED: cron-job.org] — Free tier up to 60x/hour, custom HTTP headers
- [CITED: docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax] — 5-minute schedule minimum
- [CITED: github.com/supabase/supabase pg_net guide] — pg_cron + net.http_get pattern
- [VERIFIED: codebase] — `vercel.json`, `package.json`, `next.config.ts`, cron route, scraper Dockerfile, migration 005

### Secondary (MEDIUM confidence)
- [Context7 /supabase/supabase] — pg_cron + pg_net HTTP schedule examples

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — locked in CONTEXT; official Vercel/Fly/Supabase/cron-job.org docs cited Aug 2026
- Architecture: **HIGH** — existing routes/worker; no new app logic
- Pitfalls: **HIGH** — vercel.json blocker confirmed in repo; GHA 5-min gap newly verified

**Research date:** 2026-08-04 (force refresh)
**Valid until:** 2026-09-04 (30 days — stable deploy domain)

## RESEARCH COMPLETE
