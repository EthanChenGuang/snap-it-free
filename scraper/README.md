# 手慢无 (ShouManWu) Scraper Worker

Dedicated Node.js worker that ingests free/regalo listings from Subito.it (Veneto) into Supabase Postgres/PostGIS.

## Environment

Copy `.env.example` to `.env` and set:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role (worker only)
- `PROXY_URL` — residential rotating proxy endpoint (recommended for production)
- `CRON_ENABLED=true` — 90-minute in-process schedule with overlap guard
- Alerting: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (preferred), or `RESEND_API_KEY` + `ALERT_FROM` + `ALERT_TO`

Apply migrations from `../supabase/migrations/` before first run.

## Local development

```bash
npm ci
npm test
npm run scrape:once   # one-shot Subito run (DB config via config-loader, D-18)
CRON_ENABLED=false node --import tsx src/worker.ts -- --source subito --once
```

`config-loader` logs when falling back to `SUBITO_CATEGORY_URLS` or `PROXY_URL` env (bootstrap path per D-20). DB `proxy_enc` decrypts via `SCRAPER_SECRETS_KEY` when set.

## Docker

```bash
docker build -t shou-man-wu-scraper .
docker run --env-file .env shou-man-wu-scraper
```

## Deploy

**Fly.io:** Create a `fly.toml` with a single always-on Machine, mount secrets via `fly secrets set`, and use the Dockerfile `CMD` (sets `CRON_ENABLED=true` by default).

**Hetzner VPS:** Build the image or run `npm ci && node --import tsx src/worker.ts` under systemd; alternatively use OS cron every 90 minutes with `CRON_ENABLED=false` for one-shot invocations: `*/90 * * * * cd /app/scraper && node --import tsx src/worker.ts`.

## Pipeline

Category crawl → batch validation gate → normalize/persist → `scrape_runs` audit. Failed batches send operator alerts and persist zero listing mutations (D-19, D-20).
