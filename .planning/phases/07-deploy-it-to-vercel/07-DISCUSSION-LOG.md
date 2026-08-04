# Phase 7: deploy it to Vercel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-04
**Phase:** 07-deploy-it-to-vercel
**Areas discussed:** All four gray areas (Claude-selected — user deferred)

---

## What ships where — Next.js on Vercel vs scraper worker hosting

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel Next.js + Fly.io Docker worker | Next.js on Vercel; scraper via existing Dockerfile on Fly.io (~$5–7/mo) | ✓ |
| Vercel only (no worker deploy) | App live but no listing supply without manual scraper runs | |
| Vercel + Railway worker | Same split; Railway alternative if Fly blocked | |
| Everything on one VPS | Cheaper at scale but more ops burden for solo builder | |

**User's choice:** "you choose the best practice for me"
**Notes:** Phase 6 D-53 already locks worker off Vercel serverless. Fly.io recommended for Docker + budget.

---

## Domain & URL strategy — custom domain vs vercel.app, production URL for OAuth

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel default subdomain for v1 | `*.vercel.app`; custom domain deferred | ✓ |
| Custom domain at launch | Better branding but DNS cost + setup time | |
| ngrok/tunnel for production | Dev-only pattern; not for production | |

**User's choice:** Claude discretion
**Notes:** Supabase + Google OAuth redirect URLs must match production hostname. `NEXT_PUBLIC_APP_URL` set to stable production URL.

---

## Environment tiers — production-only vs preview + production env vars

| Option | Description | Selected |
|--------|-------------|----------|
| Production full secrets; preview public-only | OAuth/cron broken on preview — acceptable solo v1 | ✓ |
| Full secrets on preview too | OAuth works on PR previews but secret sprawl risk | |
| Separate staging Supabase | Isolated but doubles cost/complexity | |

**User's choice:** Claude discretion
**Notes:** Aligns with lean budget and solo builder constraints from PROJECT.md.

---

## Deploy trigger & workflow — git auto-deploy, first-deploy checklist, rollback

| Option | Description | Selected |
|--------|-------------|----------|
| Git push → Vercel auto-deploy + smoke checklist | Standard Vercel flow; instant rollback | ✓ |
| Manual CLI deploy only | More control; slower iteration | |
| Vercel Hobby (no Pro) | Free but cron reliability uncertain | |

**User's choice:** Claude discretion
**Notes:** Vercel Pro recommended for cron within $20–100/mo budget. Build must use `next build --webpack`.

---

## Claude's Discretion

User selected "you choose the best practice for me" for all four gray areas. Full decisions captured in `07-CONTEXT.md` (D-01 through D-20).

## Deferred Ideas

- Custom domain post-validation
- Preview OAuth wildcards
- GitHub Actions CI beyond Vercel
- Staging Supabase project
