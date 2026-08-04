# Phase 7: deploy it to Vercel - Research

**Researched:** 2026-08-04
**Domain:** Vercel Hobby Next.js PWA deploy, external alert cron, Fly.io Playwright worker, Supabase production auth
**Confidence:** HIGH

## Summary

Phase 7 ships the existing Next.js PWA to **Vercel Hobby (free)** and the **scraper worker** to **Fly.io (~$3–6/mo)**, keeping Supabase as the managed cloud database (~$25/mo already budgeted). The codebase is deploy-ready: `package.json` already runs `next build --webpack`, MapLibre worker copy runs on `postinstall`, Serwist builds the service worker in production, the cron route accepts `Authorization: Bearer $CRON_SECRET`, and `scraper/Dockerfile` is production-ready.

The **blocking deploy issue** is current `vercel.json` — `"schedule": "*/3 * * * *"` **will fail Hobby deployment** because Hobby cron expressions may run at most once per day [CITED: vercel.com/docs/cron-jobs/usage-and-pricing]. Phase 7 must **remove or replace** that entry before the first production deploy (D-15, D-15b).

Alert matching every 3 minutes must move to a **$0 external scheduler** (preferred: cron-job.org or GitHub Actions) calling `GET /api/cron/match-alerts` with the bearer secret, or alternatively **Supabase `pg_cron` + `pg_net`** (project already uses `pg_cron` in migration 005) [CITED: github.com/supabase/supabase pg_net docs]. Do **not** upgrade to Vercel Pro solely for cron (saves ~$20/mo vs prior draft).

OAuth works via `window.location.origin` in `AuthPromptModal` — production Google login requires **Supabase URL Configuration** (Site URL + redirect allowlist) and **Google Cloud Console** authorized redirect URIs pointing at Supabase's callback, not the app directly [CITED: supabase.com/docs/guides/auth/redirect-urls]. Fly.io worker deploy needs a new **`scraper/fly.toml`** with **no `http_service`** (background process only), secrets via `fly secrets set`, and **`ams` (Amsterdam)** as the closest EU region to Venice [CITED: fly.io/docs/languages-and-frameworks/dockerfile].

**Primary recommendation:** Remove sub-daily `vercel.json` crons → deploy Vercel Hobby with full production env → configure free external HTTP cron every 3 min → deploy Fly.io 512MB worker from `scraper/` → run D-19 smoke checklist → instant rollback if any gate fails.

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

## Recommended Approach (cost-optimized stack per D-21)

Ship in this order — each step unblocks the next:

| Step | Action | Cost |
|------|--------|------|
| 1 | **Fix `vercel.json`** — delete the `crons` array entirely (or leave empty `[]`) so Hobby deploy succeeds | $0 |
| 2 | **Connect repo to Vercel** — root directory, framework Next.js, build `npm run build`, install `npm install`, Node 20.x+ | $0 |
| 3 | **Set Vercel Production env vars** — full secret inventory (see Standard Stack table below); Preview gets `NEXT_PUBLIC_*` only (D-10) | $0 |
| 4 | **Configure Supabase Auth URLs** — Site URL = `https://<project>.vercel.app`; Redirect URLs = production callback + `http://localhost:3003/**` for local dev (D-07) | $0 (existing Supabase bill) |
| 5 | **Configure Google OAuth console** — Authorized redirect URI = Supabase project callback (`https://<ref>.supabase.co/auth/v1/callback`); not the app `/auth/callback` (D-08) | $0 |
| 6 | **Deploy production** — push to `main` or `vercel deploy --prod` [CITED: vercel.com/docs/cron-jobs/quickstart] | $0 |
| 7 | **External cron** — cron-job.org (or GitHub Actions) hits `GET https://<project>.vercel.app/api/cron/match-alerts` every 3 min with `Authorization: Bearer <CRON_SECRET>` | $0 |
| 8 | **Fly.io worker** — `cd scraper && fly launch --no-deploy`; set 512MB `shared-cpu-1x`, region `ams`, no HTTP service; `fly secrets set`; `fly deploy`; verify scrape run in logs | ~$3.19–3.99/mo |
| 9 | **D-19 smoke checklist** — all five gates green before calling phase done | $0 |
| 10 | **Rollback drill** — confirm Vercel Instant Rollback works on a prior deployment (D-20) | $0 |

**Cron provider recommendation (planner discretion):** Prefer **cron-job.org** for solo v1 — no repo workflow file, dashboard UI, free tier supports 3-minute intervals with custom headers. **GitHub Actions** is viable if repo is already on GitHub and user accepts a `.github/workflows/match-alerts-cron.yml` (still $0, secrets in GitHub Actions env). **Supabase pg_cron + pg_net** is the fallback if external SaaS is blocked — reuses existing `pg_cron` extension from migration 005 but requires new migration + `pg_net` enable + Vault secret for `CRON_SECRET`.

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
| Fly.io Machines | platform | Scraper worker | Always-on Docker; ~$3/mo at 512MB [CITED: fly.io/docs/about/pricing] |
| Supabase cloud | existing | DB + Auth | No self-host (D-03) |
| External HTTP cron | cron-job.org / GHA | 3-min alert poller | $0; bypasses Hobby cron limit (D-15b) |

### Vercel Production Environment Variables

Set in Vercel Dashboard → Project → Settings → Environment Variables → **Production** only (unless noted):

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | yes | Public; push subscribe |
| `NEXT_PUBLIC_APP_URL` | yes | D-06: `https://<project>.vercel.app` — set `VAPID_SUBJECT` to same or `mailto:` |
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

**Gap:** Root `.env.example` is incomplete — missing VAPID/CRON keys added in Phase 4. Planner should add a task to align `.env.example` with production inventory before deploy docs.

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
| External HTTP cron (preferred) | Supabase pg_cron + pg_net | Keeps scheduling in DB; needs migration + Vault secret |
| Fly.io 512MB | Fly.io 1GB | +~$2.50/mo; only if Playwright OOM in smoke |
| Fly.io | Hetzner CX23 (D-02b) | Cheaper RAM but manual Docker/systemd ops |
| Vercel Hobby | Vercel Pro | +$20/mo; only last resort for cron (D-15) |

**Installation:** This phase deploys existing code — **no new npm packages**. Install Fly CLI: `curl -L https://fly.io/install.sh | sh` [CITED: fly.io/docs].

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
│  External cron ($0) ────┼──► GET /api/cron/match-alerts                 │
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
│  Fly.io worker ($3-6) ──┘  Playwright scrape → listings ingest         │
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

.github/workflows/      # OPTIONAL — match-alerts-cron.yml if GHA chosen
```

### Pattern 1: Remove Hobby-Blocking Cron Before Deploy

**What:** Delete sub-daily Vercel cron; use external HTTP ping instead.
**When to use:** Always on Vercel Hobby (D-15).
**Example:**

```json
{
  "crons": []
}
```

Or omit `crons` key entirely. Route auth unchanged:

```typescript
// app/api/cron/match-alerts/route.ts — already supports external cron
if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
  return true;
}
```

### Pattern 2: External Cron (cron-job.org)

**What:** Free SaaS scheduler hits production URL with bearer token.
**When to use:** Preferred D-15b path — zero infra, no Supabase migration.
**Example:**

```
URL:     https://<project>.vercel.app/api/cron/match-alerts
Method:  GET
Schedule: */3 * * * *
Header:  Authorization: Bearer <CRON_SECRET>
Expected: 200 {"processed":N}
```

### Pattern 3: Supabase pg_cron + pg_net (alternative)

**What:** DB-native HTTP GET on schedule; reuses pg_cron from migration 005.
**When to use:** If external cron SaaS blocked; stays within Supabase bill.
**Example:**

```sql
-- Source: [CITED: github.com/supabase/supabase pg_net guide]
-- Requires: pg_net extension enabled in Dashboard
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

Store `CRON_SECRET` in Supabase Vault; do not hardcode in SQL committed to git.

### Pattern 4: Fly.io Background Worker (no HTTP)

**What:** Deploy `scraper/Dockerfile` as a process-only Machine — no `[http_service]`.
**When to use:** Always for scraper (D-02).
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
```

Deploy commands:

```bash
cd scraper
fly launch --no-deploy          # create app + fly.toml if not present
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... PROXY_URL=...
fly deploy
fly scale count 1               # exactly one worker
fly machine list                # note machine ID
fly machine update <id> --restart always
```

If OOM (exit 137 / "Killed"): `fly scale memory 1024` (~$5.70/mo in `iad`, ~$7.12 in `ams`) [CITED: fly.io/docs/about/pricing].

### Pattern 5: Supabase + Google OAuth Production URLs

**What:** Configure auth allowlist before first production login test.
**When to use:** Step 4–5 of Recommended Approach.
**Checklist:**

| Where | Setting | Value |
|-------|---------|-------|
| Supabase → URL Configuration | Site URL | `https://<project>.vercel.app` |
| Supabase → Redirect URLs | Allowlist | `https://<project>.vercel.app/auth/callback` |
| Supabase → Redirect URLs | Local dev | `http://localhost:3003/**` |
| Google Cloud Console | Authorized redirect URIs | `https://<ref>.supabase.co/auth/v1/callback` |
| Google Cloud Console | Authorized JavaScript origins | `https://<project>.vercel.app` |

Note: `AuthPromptModal` builds redirect as `${window.location.origin}/auth/callback?next=...` — works on Vercel subdomain without code change. D-06 `NEXT_PUBLIC_APP_URL` is for canonical share/VAPID URLs, not OAuth client redirect (which uses runtime origin).

### Anti-Patterns to Avoid

- **Keeping `*/3` in `vercel.json` on Hobby:** Deploy fails immediately [CITED: vercel.com/docs/cron-jobs/usage-and-pricing].
- **Deploying scraper to Vercel Serverless:** Playwright + long-running scheduler incompatible with function timeouts (D-02).
- **Adding `http_service` to Fly worker:** Exposes worker publicly; unnecessary attack surface.
- **Copying secrets into git / fly.toml `[env]`:** Use Vercel dashboard + `fly secrets set` (D-11).
- **Testing push on `http://localhost`:** PushManager requires secure context; test on deployed HTTPS (D-17).
- **Using Turbopack for production build:** Breaks MapLibre worker static analysis (D-13, `next.config.ts` comment).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sub-daily cron on Hobby | Custom Vercel workaround | External HTTP cron or pg_cron | Platform enforces daily limit at deploy |
| Playwright hosting | Vercel cron + serverless scrape | Fly.io Docker worker | Browser + long process exceeds serverless limits |
| Service worker build | Hand-rolled `public/sw.js` | `@serwist/next` (installed) | Precache, webpack integration already wired |
| OAuth token exchange | Custom JWT parsing | Supabase PKCE + `exchangeCodeForSession` | Already in `app/auth/callback/route.ts` |
| Cron auth | IP allowlist only | `CRON_SECRET` bearer (existing) | Route already implements; works with any external caller |
| Worker config deploys | Redeploy on URL change | Supabase DB config pull (Phase 6) | Worker reads config each run |

**Key insight:** Phase 7 is **wiring and configuration**, not new application logic. The highest-risk work is platform config (env vars, auth URLs, cron removal) and Fly worker sizing.

## Common Pitfalls

### Pitfall 1: vercel.json Deploy Failure on Hobby

**What goes wrong:** Deploy rejected with *"Hobby accounts are limited to daily cron jobs. This cron expression would run more than once per day."*
**Why it happens:** Current `vercel.json` has `"schedule": "*/3 * * * *"`.
**How to avoid:** Remove crons array before first Hobby deploy; configure external scheduler after URL is known.
**Warning signs:** Build succeeds locally but Vercel production deploy fails during project settings validation.

### Pitfall 2: MapLibre Blank Map on Production

**What goes wrong:** Map style loads but no tiles render — blank canvas.
**Why it happens:** MapLibre worker not copied to `public/maplibre/`; webpack inlines `import.meta.url` as `file://` [VERIFIED: codebase `scripts/copy-maplibre-worker.mjs`, `lib/map/maplibreWorker.ts`].
**How to avoid:** Ensure `npm install` runs on Vercel (triggers `postinstall`); verify build log shows `maplibre worker X.X -> public/maplibre/`; confirm `/maplibre/maplibre-gl-worker.mjs` returns 200 on production.
**Warning signs:** Smoke check (1) fails — map shell visible, zero pins/tiles.

### Pitfall 3: Serwist SW / Push Failures

**What goes wrong:** Push subscribe fails; stale SW serves old assets; dev tunnel conflicts.
**Why it happens:** Push requires HTTPS secure context; SW only builds when `NODE_ENV !== 'development'`; tunnel + prod SW conflict documented in `SerwistProvider.tsx`.
**How to avoid:** Test push only on `https://<project>.vercel.app`; verify `/sw.js` exists post-build; use production URL for D-19 push smoke, not preview.
**Warning signs:** `Notification.requestPermission` rejected; console shows SW registration errors.

### Pitfall 4: OAuth Redirect Mismatch

**What goes wrong:** Google login returns to Supabase error or `auth=error` redirect.
**Why it happens:** Supabase allowlist missing production callback; Google Console points to app URL instead of Supabase callback.
**How to avoid:** Follow Pattern 5 checklist before smoke test (2).
**Warning signs:** Supabase Auth logs show `redirect_uri_mismatch`.

### Pitfall 5: Fly.io Playwright OOM at 512MB

**What goes wrong:** Worker exits with code 137; Chromium fails to launch.
**Why it happens:** Playwright + Node + Crawlee exceeds 512MB during scrape.
**How to avoid:** Start at 512MB per D-02; monitor first scrape in `fly logs`; upsize to 1GB only if OOM confirmed.
**Warning signs:** Smoke check (5) fails; logs show `Killed` or browser launch timeout.

### Pitfall 6: Instant Rollback Stale Config

**What goes wrong:** Rollback restores old code but env vars / cron config don't match.
**Why it happens:** Vercel Instant Rollback restores deployment snapshot including cron definitions from that deployment [CITED: vercel.com/docs/instant-rollback].
**How to avoid:** Document rollback procedure; re-verify external cron still points to live URL; env vars stay at project level (not rolled back).
**Warning signs:** App works but cron/auth breaks after rollback.

## Pitfalls

Consolidated blocking issues for planner verification gates:

1. **`vercel.json` `*/3` cron → Hobby deploy hard-fail** — must fix in Wave 0 / pre-deploy task.
2. **MapLibre `postinstall` on Vercel** — verify worker files in build output.
3. **Serwist requires HTTPS** — push smoke only on production URL.
4. **OAuth triple-config** — Supabase URLs + Google Console + (optional) Apple.
5. **Fly worker is not HTTP** — no `http_service`; use logs for smoke (5).
6. **`.env.example` incomplete** — VAPID/CRON vars missing from template; align before deploy runbook.
7. **Preview env has no secrets** — don't debug OAuth/cron on preview (D-10).

## Code Examples

### External Cron Smoke Test

```bash
# After deploy + CRON_SECRET set in Vercel Production
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

### Local Production Build Verification (pre-push)

```bash
npm install && npm run build
# Verify: .next/ output; public/sw.js; public/maplibre/*.mjs
test -f public/maplibre/maplibre-gl-worker.mjs && echo "maplibre worker OK"
test -f public/sw.js && echo "serwist sw OK"
```

### GitHub Actions Cron (alternative to cron-job.org)

```yaml
# .github/workflows/match-alerts-cron.yml — store CRON_SECRET in repo secrets
name: Match alerts poller
on:
  schedule:
    - cron: '*/3 * * * *'
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "https://<project>.vercel.app/api/cron/match-alerts"
```

## Discretion items for planner

| Item | Options | Recommendation | Rationale |
|------|---------|----------------|-----------|
| External cron provider | cron-job.org / GitHub Actions / pg_cron | **cron-job.org** first | Zero repo changes; dashboard setup; D-15b preferred path |
| Fly.io region | `ams` / `fra` / `iad` | **`ams` (Amsterdam)** | Closest Fly EU region to Venice; ~$3.99/mo at 512MB vs $3.19 in `iad` [CITED: fly.io/docs/about/pricing] |
| Worker RAM | 512MB / 1GB | **512MB default** | D-02; upsize only after OOM in smoke (5) |
| `NEXT_PUBLIC_APP_URL` vs `NEXT_PUBLIC_SITE_URL` | D-06 naming | **`NEXT_PUBLIC_APP_URL`** per CONTEXT | Supabase docs use `NEXT_PUBLIC_SITE_URL` — pick one, document in Vercel env |
| `.env.example` sync | Update now vs deploy task | **Update in Wave 0** | Template missing VAPID/CRON; reduces deploy mistakes |
| Preview OAuth wildcards | Add `https://*-.vercel.app/**` or skip | **Skip** (D-07 default) | Preview has no server secrets anyway (D-10) |
| Hetzner fallback | Fly blocked → CX23 | **Document in runbook only** | D-02b; don't plan unless Fly signup fails |
| Rollback verification | Manual vs automated | **Manual smoke after rollback drill** | D-20; confirm map + auth still work |

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
| Hobby deploy succeeds | No daily-cron deploy error | build | `npm run build` (local proxy); Vercel deploy log green | ✅ |
| MapLibre worker present | Worker files copied | unit/smoke | `test -f public/maplibre/maplibre-gl-worker.mjs` after build | ✅ script |
| Cron auth gate | 401 without secret; 200 with bearer | integration | `curl` against production URL (manual env) | ✅ route |
| Cron matcher logic | processPendingListingEvents | unit | `npm run test:lib -- lib/alerts/process-events.test.ts` | ✅ |
| Serwist SW built | sw.js emitted in production | build | `test -f public/sw.js` after `npm run build` | ✅ |
| OAuth callback | PKCE exchange | manual | D-19 smoke (2) on production HTTPS | ❌ manual |
| Admin gate | Non-operator redirected | manual | D-19 smoke (4) | ❌ manual |
| Push subscribe | HTTPS + VAPID | manual | D-19 smoke — Settings push toggle | ❌ manual |
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

1. Vercel Dashboard → Deployments → select previous production deployment → **Instant Rollback**
2. Re-run smoke checks 1, 2, 4 (cron external config unchanged; env vars at project level)
3. Note: rolled-back deployment restores **that deployment's `vercel.json` cron state** — with external cron, this is harmless

### Sampling Rate

- **Per task commit:** `npm run build && npm test`
- **Per wave merge:** `npm test && cd scraper && npm test`
- **Phase gate:** D-19 smoke checklist all green + rollback drill confirmed

### Wave 0 Gaps

- [ ] Remove/fix `vercel.json` crons (Hobby blocker)
- [ ] Create `scraper/fly.toml` (background worker, 512MB, `ams`)
- [ ] Align `.env.example` with full production env inventory (VAPID, CRON, etc.)
- [ ] Deploy runbook markdown or checklist in plan (not necessarily new file — can be plan tasks)
- [ ] Install `flyctl` on operator machine (not installed in research environment)
- [ ] Configure external cron after first production URL known

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth PKCE; production redirect allowlist |
| V3 Session Management | yes | `@supabase/ssr` cookie session (existing) |
| V4 Access Control | yes | `/admin` middleware + `operator_allowlist` RLS |
| V5 Input Validation | yes | Existing Zod Route Handlers |
| V6 Cryptography | yes | VAPID keys via env; `SCRAPER_SECRETS_KEY` for proxy encryption |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cron endpoint abuse | DoS | `CRON_SECRET` bearer gate (existing D-106) |
| Secret leakage via preview | Info Disclosure | Preview gets `NEXT_PUBLIC_*` only (D-10) |
| Service role key in browser | Info Disclosure | Server-only env; never `NEXT_PUBLIC_` prefix |
| OAuth redirect hijack | Spoofing | Supabase allowlist + `safeNextPath` |
| Worker env in git | Info Disclosure | `fly secrets set` only (D-11) |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Local build | ✓ | v23.10.0 | Vercel uses managed Node 20.x |
| npm | Install/build | ✓ | 11.4.2 | — |
| Vercel CLI | Optional deploy | ✓ | 48.1.6 | Git push auto-deploy (D-18) |
| flyctl | Worker deploy | ✗ | — | Install via fly.io/install.sh |
| Docker | Local worker test | ? | — | Fly remote builder (default) |
| Supabase project | App + worker | ✓ (assumed) | cloud | Blocker if not provisioned |
| cron-job.org account | External cron | ? | free tier | GitHub Actions or pg_cron |

**Missing dependencies with no fallback:**
- Supabase cloud project with migrations applied (D-03)
- Google OAuth credentials configured in Supabase

**Missing dependencies with fallback:**
- `flyctl` not installed → install before worker deploy
- cron-job.org → GitHub Actions or Supabase pg_cron

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel Pro for `*/3` cron | External HTTP cron on Hobby | Phase 7 CONTEXT (D-15b) | Saves ~$20/mo |
| Vercel Cron auth via UA only | Bearer `CRON_SECRET` primary | Phase 4 D-106 | External cron compatible |
| Fixed 90min scraper cron | DB-driven scheduler (60s tick) | Phase 6 | Worker deploy doesn't set scrape URLs |
| `next-pwa` | Serwist `@serwist/next` 9.x | Phase 4 | Requires `--webpack` build |

**Deprecated/outdated:**
- Sub-daily `vercel.json` cron on Hobby: platform rejects at deploy [CITED: vercel.com/docs/cron-jobs/usage-and-pricing]
- Turbopack production build: breaks MapLibre worker (project convention)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase project already on Pro with migrations through 018 applied | Recommended Approach | Deploy succeeds but admin/auth/alerts break |
| A2 | Google OAuth already configured in Supabase for local dev | OAuth checklist | Production login fails until console updated |
| A3 | cron-job.org free tier supports 3-min interval with custom headers | Discretion | Fall back to GHA or pg_cron |
| A4 | 512MB sufficient for Playwright Chromium scrape | Fly sizing | Need 1GB (+~$2.50/mo) |
| A5 | `flyctl` install succeeds on operator machine | Environment | Use Hetzner fallback (D-02b) |

## Open Questions (RESOLVED)

1. **Exact Vercel project name / production URL** — **RESOLVED at 07-01 tracer deploy:** URL is `https://<project-name>.vercel.app`; set `NEXT_PUBLIC_APP_URL` in Vercel Production immediately after first deploy (D-06).

2. **pg_net extension enabled?** — **RESOLVED: only if external cron blocked.** Default path is cron-job.org (D-15b). Check Supabase Dashboard → Extensions only if cron-job.org signup fails.

## Project Constraints (from .cursor/rules/)

- All user-facing UI MUST follow `.planning/google-stitch-ui-design/DESIGN.md` — Phase 7 is deploy-only; no UI changes unless smoke reveals breakage.
- Monochrome Stitch tokens if any deploy-status UI added (unlikely).
- Use `@theme` tokens from `app/globals.css` — not default shadcn themes.

## Sources

### Primary (HIGH confidence)
- [CITED: vercel.com/docs/cron-jobs/usage-and-pricing] — Hobby daily cron limit, deploy failure on sub-daily expressions
- [CITED: vercel.com/docs/cron-jobs/manage-cron-jobs] — Cron accuracy by plan; multi-schedule example
- [CITED: vercel.com/docs/instant-rollback] — Rollback behavior, cron revert caveat
- [CITED: supabase.com/docs/guides/auth/redirect-urls] — Site URL, Vercel preview wildcards, redirect allowlist
- [CITED: fly.io/docs/languages-and-frameworks/dockerfile] — fly launch, secrets, deploy workflow
- [CITED: fly.io/docs/about/pricing] — shared-cpu-1x 512MB ~$3.19/mo (iad), ~$3.99 (ams); 1GB ~$5.70/$7.12
- [VERIFIED: codebase] — `vercel.json`, `package.json`, `next.config.ts`, cron route, MapLibre worker script, scraper Dockerfile

### Secondary (MEDIUM confidence)
- [Context7 /websites/vercel] — Production deploy `--prod`, env run patterns
- [Context7 /supabase/supabase] — pg_cron + pg_net HTTP schedule examples
- [CITED: fly.io/docs/blueprints/long-running-tasks] — Background worker without http_service

### Tertiary (LOW confidence — verify at execution)
- Third-party cron comparison blogs (Runhooks, crontap) — Hobby "2 cron jobs" claim conflicts with official "100 cron jobs"; **trust official Vercel docs** for job count; daily frequency limit is confirmed across sources

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — locked in CONTEXT; codebase verified; official Vercel/Fly/Supabase docs cited
- Architecture: **HIGH** — existing routes/worker; no new app logic
- Pitfalls: **HIGH** — vercel.json blocker confirmed in repo; MapLibre/Serwist patterns documented in code

**Research date:** 2026-08-04
**Valid until:** 2026-09-04 (30 days — stable deploy domain)
