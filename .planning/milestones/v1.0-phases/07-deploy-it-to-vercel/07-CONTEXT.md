# Phase 7: deploy it to Vercel - Context

> **Deferred → v2.0 (2026-08-09):** Postponed to next milestone. Plans preserved; resume with `/gsd-execute-phase 7` when v2.0 starts.

**Gathered:** 2026-08-04
**Status:** Ready for planning
**Mode:** Claude-selected best practices (user deferred all gray areas)

<domain>
## Phase Boundary

Phase 7 ships the ShouManWu **Next.js PWA** to production on **Vercel (Hobby / free tier)** with correct build settings, environment variables, OAuth/callback URLs, alert-matcher scheduling, and Serwist service worker — so real users can browse, auth, favorite, alert, and post against the live Supabase backend.

**Cost target (incremental deploy compute, excluding Supabase ~$25/mo already budgeted):** **~$3–6/mo** — not Vercel Pro + oversized worker.

**Companion deploy (same phase, not on Vercel):** the **`scraper/` Docker worker** must also run in production so listings continue to ingest (Phase 6 D-53: worker is never Vercel serverless). Supabase remains the managed cloud database — no self-hosting.

**Out of scope:** Custom domain purchase/DNS (deferred post-validation), CI beyond Vercel git integration, staging Supabase project, native mobile app, deploying `scraper-admin/` Vite reference app, Fly/Railway migration if worker already runs elsewhere.

**Depends on:** Phase 6 complete enough that admin config + worker scheduler are operational (or Phase 7 plans a minimal worker deploy path that reads existing DB config).

</domain>

<decisions>
## Implementation Decisions

### Deployment Scope (What Ships Where)
- **D-01:** **Vercel Hobby (free) hosts the Next.js app only** — repo root, default framework preset, no monorepo subfolder — **Reversibility:** reversible.
- **D-02:** **Scraper worker deploys separately** via existing `scraper/Dockerfile` on **Fly.io shared-cpu-1x 512MB** (~$3.19/mo always-on; bump to 1GB ~$5.70/mo only if Playwright OOMs in smoke test) — **not** Vercel Serverless — **Reversibility:** costly — ops runbook + env duplication.
- **D-02b:** **Hetzner CX23 (~€3.99/mo, 4GB RAM)** is the **cheapest raw compute fallback** if Fly.io trial/credit limits block signup — accepts more Linux ops (Docker + systemd/Coolify) — **Reversibility:** costly.
- **D-03:** **Supabase project stays cloud-hosted** (existing project); Phase 7 configures production redirect URLs and verifies migrations applied — no Supabase self-host — **Reversibility:** one-way — production data anchor.
- **D-04:** **`scraper-admin/` Vite app is not deployed** — admin UI lives at `/admin` in Next.js per Phase 6 D-53 — **Reversibility:** reversible.

### Domain & URL Strategy
- **D-05:** **v1 launch on Vercel default subdomain** (`https://<project-name>.vercel.app`) — custom domain deferred until post-validation — **Reversibility:** reversible — DNS add later without code changes if env uses `VERCEL_URL` pattern.
- **D-06:** Production canonical URL via env **`NEXT_PUBLIC_APP_URL`** (or equivalent) set to the stable production hostname — used for OAuth `redirectTo`, share links, and VAPID subject consistency — **Reversibility:** costly — touches auth callback and push config.
- **D-07:** **Supabase Auth redirect allowlist** must include `https://<production-host>/auth/callback` — add preview wildcard `https://*-*.vercel.app/auth/callback` only if preview OAuth testing is required (default: skip preview OAuth) — **Reversibility:** reversible.
- **D-08:** **Google OAuth** (and Apple when enabled) provider consoles updated with Supabase callback URL + production site URL — document in deploy checklist — **Reversibility:** reversible.

### Environment Tiers & Secrets
- **D-09:** **Production environment** on Vercel gets the full secret set from `.env.example` / `.env.local.example`: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `VAPID_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `OPERATOR_BOOTSTRAP_EMAILS`, `SCRAPER_SECRETS_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, optional `TELEGRAM_*` / `RESEND_*` — **Reversibility:** one-way — live secrets in platform.
- **D-10:** **Preview deployments** get **public vars only** (`NEXT_PUBLIC_*`); server secrets omitted — OAuth and cron will not work on preview (acceptable for solo v1) — **Reversibility:** reversible.
- **D-11:** **Never commit** `.env.local` or production secrets to git — Vercel dashboard + Fly.io secrets only — **Reversibility:** one-way — security boundary.
- **D-12:** Scraper worker on Fly.io mirrors Supabase + service-role + proxy/alert env from `scraper/.env.example` — config for URLs/schedules comes from Supabase DB per Phase 6 D-18 — **Reversibility:** costly.

### Vercel Build & Runtime
- **D-13:** Build command **`npm run build`** (already runs `next build --webpack` for MapLibre compatibility) — do not switch to Turbopack in production — **Reversibility:** reversible.
- **D-14:** Install command **`npm install`** — `postinstall` copies MapLibre worker (`scripts/copy-maplibre-worker.mjs`) — verify build succeeds on Vercel before marking deploy done — **Reversibility:** reversible.
- **D-15:** **Do NOT use Vercel Pro ($20/mo)** solely for cron — Hobby limits built-in cron to **once per day**, and current `vercel.json` `*/3 * * * *` **will fail Hobby deploy** — **Reversibility:** reversible.
- **D-15b:** **Alert matcher scheduling (cost-optimized, pick one):**
  - **Preferred:** Remove sub-daily entry from `vercel.json` crons; use **free external HTTP cron** (e.g. cron-job.org, GitHub Actions schedule, or Uptime Kuma) to `GET /api/cron/match-alerts` every 3 min with `Authorization: Bearer $CRON_SECRET` — route already supports this — **$0 extra**
  - **Alternative:** Supabase **`pg_cron` + `pg_net`** HTTP call to production URL (same pattern as migration 005 expiry job; keeps scheduling in existing Supabase bill) — **$0 extra**
  - **Last resort:** Vercel Pro only if external cron is unacceptable — **+$20/mo**
- **D-16:** **`CRON_SECRET`** required in Vercel production env regardless of scheduler choice — **Reversibility:** reversible.
- **D-17:** **Serwist service worker** builds in production (`disable` only in development per `next.config.ts`) — smoke-test push subscribe on deployed HTTPS URL — **Reversibility:** reversible.

### Deploy Workflow & Verification
- **D-18:** **Git-connected auto-deploy** — push to `main` triggers production deploy (Vercel default) — **Reversibility:** reversible.
- **D-19:** **First-deploy smoke checklist:** (1) `/` map loads pins, (2) Google login completes round-trip, (3) cron route returns 200 with auth, (4) `/admin` gates non-operators, (5) Fly worker logs show successful scrape run — **Reversibility:** reversible.
- **D-20:** **Rollback** via Vercel instant rollback to previous deployment — no custom blue/green in v1 — **Reversibility:** reversible.

### Cost Summary (locked for planning)
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Deployment & Platform
- `vercel.json` — Cron schedule for alert matcher (`/api/cron/match-alerts`, `*/3 * * * *`)
- `next.config.ts` — Serwist SW, MapLibre/webpack constraints, image remote patterns
- `package.json` — `build` uses `next build --webpack`; `postinstall` MapLibre worker copy
- `.env.example` — Full server env var inventory for Vercel production
- `.env.local.example` — Supabase public keys template

### Cron & Push (Phase 4)
- `app/api/cron/match-alerts/route.ts` — CRON_SECRET + vercel-cron auth (D-106)
- `lib/pwa/usePushSubscribe.ts` — Requires `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `.planning/phases/04-auth-alerts-push-notifications/04-CONTEXT.md` — D-104–D-108 push pipeline

### Scraper Worker (not Vercel)
- `scraper/Dockerfile` — Playwright + Node 22 worker image
- `scraper/.env.example` — Worker env vars
- `scraper/README.md` — Local/run instructions
- `.planning/phases/06-scraper-admin-console-configurable-sources-frequency-anti-bl/06-CONTEXT.md` — D-53 separate worker, D-18 DB config pull

### Auth & Admin
- `components/ugc/AuthPromptModal.tsx` — OAuth redirect via `/auth/callback?next=`
- `middleware.ts` — `/admin` operator gate
- `app/auth/callback/route.ts` — Auth callback handler

### Project Constraints
- `.planning/PROJECT.md` — Budget $20–100/mo, PWA-first, solo builder
- `.planning/ROADMAP.md` — Phase 7 entry, depends on Phase 6

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `vercel.json` — Cron already configured; no new cron infrastructure needed
- `app/api/cron/match-alerts/route.ts` — Production-ready matcher (Phase 4/5)
- `scraper/Dockerfile` — Production worker image ready for Fly.io/Railway deploy
- `.env.local` — Local dev already has Supabase, VAPID, CRON_SECRET values (use as reference for Vercel env setup, do not copy secrets to repo)

### Established Patterns
- Next.js **must use webpack** build — Turbopack breaks MapLibre worker (`next.config.ts` comment)
- Auth uses **PKCE + `/auth/callback?next=`** — production URL must match Supabase allowlist
- Scraper **reads config from Supabase each run** — worker deploy does not require redeploy for URL/schedule changes (Phase 6)
- Operator bootstrap via **`OPERATOR_BOOTSTRAP_EMAILS`** env after migration 018

### Integration Points
- Vercel Production → Supabase (anon + service role server-side)
- Vercel Cron → `/api/cron/match-alerts` → Supabase outbox + web-push
- Fly.io worker → Supabase service role → listings ingest
- Supabase Auth → Google/Apple/email → production callback URL

</code_context>

<specifics>
## Specific Ideas

User deferred all deployment decisions to Claude; revised for **most cost-effective** stack: Vercel Hobby + free external cron + Fly.io 512MB worker (~$3–6/mo incremental).

</specifics>

<deferred>
## Deferred Ideas

- **Custom domain** (e.g. `shoumanwu.it`) — post-validation; add DNS + Vercel domain config in a future quick task or phase
- **Preview-environment OAuth** — enable only if team grows; requires Supabase preview URL wildcards
- **GitHub Actions CI** beyond Vercel's built-in build — not needed for solo v1
- **Separate staging Supabase project** — costly; use local + production only

</deferred>

---

*Phase: 07-deploy-it-to-vercel*
*Context gathered: 2026-08-04*
