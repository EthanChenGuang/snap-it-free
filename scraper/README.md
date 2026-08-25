# 零元 (ZeroDollar / ZeroEuro) Scraper Worker

Dedicated Node.js worker that ingests free/regalo listings from Subito.it (Veneto) into Supabase Postgres/PostGIS.

## Environment

Copy `.env.example` to `.env` and set:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role (worker only)
- `PROXY_URL` — residential rotating proxy endpoint (recommended for production)
- `CRON_ENABLED=true` — 90-minute in-process schedule with overlap guard
- Alerting (priority order): `CALLMEBOT_PHONE` + `CALLMEBOT_APIKEY` (WhatsApp, recommended), or `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`, or `RESEND_API_KEY` + `ALERT_FROM` + `ALERT_TO`

Apply migrations from `../supabase/migrations/` before first run.

### WhatsApp alerts (CallMeBot)

1. Add **+34 684 72 39 62** to your WhatsApp contacts (name: CallMeBot).
2. Send **`I allow callmebot to send me messages`** to that contact.
3. Copy the **apikey** from CallMeBot's reply into `CALLMEBOT_APIKEY`; set `CALLMEBOT_PHONE` to your number in international format (e.g. `+393331234567`).
4. Test locally: `npm run test:whatsapp`

Block / validation failures trigger WhatsApp immediately (see `notifyOperator` in `src/alert/notify.ts`).

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

**Fly.io (recommended):** `scraper/fly.toml` is configured for a background worker in `ams` (512MB, ~$3.99/mo Aug 2026). No `[http_service]` — process-only scheduler.

```bash
# One-time: install CLI and log in
curl -L https://fly.io/install.sh | sh
fly auth login

cd scraper
fly launch --no-deploy   # reuse app name shoumanwu-scraper or pick a unique name
fly secrets set \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  SCRAPER_SECRETS_KEY=... \
  PROXY_URL=... \
  CALLMEBOT_PHONE=... \
  CALLMEBOT_APIKEY=... \
  TELEGRAM_BOT_TOKEN=... \
  TELEGRAM_CHAT_ID=...
fly deploy
fly scale count 1
fly logs
```

Secrets are never committed — set via `fly secrets set` only. Worker reads scrape URLs and schedules from Supabase (no redeploy for URL changes).

**Proxy (cheaper than Decodo):** Phase 16 recommends **Webshare** ($1.40/GB, 1 GB/mo free tier) over Decodo ($2.00/GB):

```bash
cd scraper
WEBSHARE_USERNAME=your_base_user WEBSHARE_PASSWORD=your_pass \
  node scripts/configure-webshare-proxy.mjs
# Optional Italy city: WEBSHARE_CITY=venice node scripts/configure-webshare-proxy.mjs
```

Then sync the same `PROXY_URL` to Fly: `fly secrets set PROXY_URL='http://...'`.

**Hetzner VPS:** Build the image or run `npm ci && node --import tsx src/worker.ts` under systemd; alternatively use OS cron every 90 minutes with `CRON_ENABLED=false` for one-shot invocations: `*/90 * * * * cd /app/scraper && node --import tsx src/worker.ts`.

## Pipeline

Category crawl → batch validation gate → normalize/persist → `scrape_runs` audit. Failed batches send operator alerts and persist zero listing mutations (D-19, D-20).
