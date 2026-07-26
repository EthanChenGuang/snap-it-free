# Stack Research

**Domain:** Map-first free-item discovery PWA (scrapers + UGC + push alerts), solo builder, $20-100/mo budget
**Researched:** 2026-07-26
**Confidence:** MEDIUM-HIGH (package versions verified directly against the npm registry = HIGH; pricing/architecture recommendations verified via web search, cross-referenced across 3+ independent sources = MEDIUM)

## Executive Take

The 2025-2026 standard for this exact shape of product (map + scraped aggregation + UGC + i18n + push, solo builder, thin budget) is a **Next.js + Supabase** monolith, not a microservices split:

- **Next.js (App Router) on Vercel** for the PWA frontend/API — one deploy target, built-in i18n routing story via `next-intl`, generous free/Pro tier.
- **Supabase (Postgres + PostGIS + Auth + Storage + pg_cron/pgmq)** as the single backend — bundles geospatial queries, auth, file storage, and job scheduling into one $25/mo Pro plan instead of stitching together 4-5 separate vendors.
- **MapLibre GL JS** (not Mapbox) for the map, because Mapbox's usage-based billing is an unnecessary risk on a $20-100/mo budget and MapLibre is free with no ceiling.
- **Crawlee + Playwright**, run on a small **dedicated always-on worker** (not Vercel serverless functions) for the Subito.it/FB Marketplace scrapers, because headless browser sessions don't fit serverless timeout models.
- **Web Push API (VAPID)** instead of Firebase Cloud Messaging, because there's no native app in v1 to unify with.

The one real architectural fork in this stack is the **scraper execution environment** — it cannot live inside the same Vercel deployment as the web app. That decision has more budget and reliability impact than any frontend framework choice.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.12 | Full-stack React framework (App Router), serves PWA + API routes | Single deploy target for UI + backend-for-frontend; native i18n routing patterns pair directly with `next-intl`; first-class Vercel deployment; Server Components reduce client JS for a content-heavy map/list feed |
| React | 19.2.8 | UI library | Required by Next.js 16; Server Components + Actions reduce boilerplate for the quick-post/claim/report flows |
| TypeScript | 7.0.2 | Type safety | TS 7 ships Microsoft's native (Go-ported) compiler — materially faster type-checking on a solo builder's machine/CI; catches scraper-schema/DB-schema drift at compile time |
| Supabase (Postgres + PostGIS + Auth + Storage) | `@supabase/supabase-js` 2.110.8 | Database, geospatial queries, auth, file storage, edge functions, cron/queue | Bundles 5 things a map+UGC+scraper app needs (relational DB, geo queries, auth, image storage, job scheduling) into one $25/mo Pro plan; PostGIS `<->` operator gives free nearest-neighbor/radius queries for "items near me" without a separate geo service |
| MapLibre GL JS | 6.0.0 | Map rendering (vector tiles, WebGL) | MIT-licensed, no access token, no usage billing — Mapbox GL JS v2+ requires an account and bills ~$5/1,000 loads past 50K/mo, an avoidable variable cost for a free product with no revenue |
| react-map-gl | 8.1.1 | React bindings for MapLibre | Declarative React wrapper (markers, popups, viewport state) over raw MapLibre GL JS; maintained by the same Uber/visgl team, supports the MapLibre adapter directly |

### Scraping & Data Acquisition

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Crawlee | 3.17.0 | Scraping framework wrapping Playwright, with request queue, session pool, and proxy rotation | Automatic browser fingerprint injection (canvas/WebGL/navigator spoofing via `fingerprint-suite`) is enabled by default — meaningfully harder for Subito.it/FB Marketplace's anti-bot systems to fingerprint than raw Playwright; built-in retry/backoff and dedup save weeks of hand-rolled infrastructure |
| Playwright | 1.62.0 | Underlying headless browser driver (used by Crawlee's `PlaywrightCrawler`) | Multi-engine (Chromium/Firefox/WebKit), auto-waiting, and the current default choice for JS-rendered scraping targets in 2026; Crawlee drives it rather than using it standalone |
| Residential proxy provider (pay-as-you-go) | n/a (SaaS) | IP rotation to avoid Subito.it/FB Marketplace rate-limiting and IP bans | Pay-as-you-go per-GB pricing ($0.55-$2/GB, e.g. DataImpulse, Webshare, RapidProxy) fits a $20-100/mo total budget; enterprise providers (Bright Data, Oxylabs) require $75-500/mo minimum commitments that would consume the entire budget alone |

### Auth, Push, i18n, PWA

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Supabase Auth (GoTrue) | bundled in `@supabase/supabase-js` | Google/Apple/email login, gated only on contact/alert/favorite/post actions | Free to 50K MAU, then bundled into the same $25/mo Pro plan up to 100K MAU — Clerk's equivalent tier costs $1,000+/mo at 100K MAU. Since the DB is already Postgres/Supabase, `auth.uid()` integrates directly with Row Level Security for UGC ownership checks |
| next-intl | 4.13.4 | IT (primary) / EN / ZH internationalization | Purpose-built for Next.js App Router with native React Server Component support and URL-based locale routing (`/it/...`, `/en/...`, `/zh/...`) — no client-side provider wrapper needed, and URL-based locale is more SEO-indexable than a client-detected locale |
| web-push | 3.6.7 | Server-side Web Push API sender (VAPID signing, payload encryption) | Standards-based Push API needs no third-party push service (no FCM project, no Google dependency) since v1 ships web-only with no native app to unify notification delivery with |
| Serwist (`@serwist/next`) | 9.5.12 | Service worker generation, install prompt, offline caching for the PWA | `next-pwa` (the older default) is unmaintained and breaks under Next.js 16's Turbopack default bundler; Serwist is the actively maintained, Workbox-based successor and the current community-recommended choice |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 4.3.3 | Utility-first styling | Fast to iterate solo/with AI assistance; pairs with shadcn/ui components without a separate design-system build |
| shadcn (CLI) | 4.15.0 | Copies accessible, unstyled Radix-based components into the repo (bottom sheet, dialog, toast, etc.) | Use for the draggable bottom sheet, contact/DM modal, and report/claim confirmation UI — you own the component code, no runtime package dependency or version lock-in |
| lucide-react | 1.27.0 | Icon set | Standard companion to shadcn/ui; consistent icon style across zone tags, map pins, and action buttons |
| zod | 4.4.3 | Runtime schema validation | Validate scraper output before insert (Subito/FB listing shape drifts silently), and validate UGC post/report form payloads server-side |
| pgmq (Postgres extension) | 0.0.5 | Postgres-native message queue for the scraper job pipeline | Enable as a Supabase extension to decouple "schedule a scrape" from "run a scrape" without adding Redis/BullMQ as a separate service |

## Infrastructure & Hosting (budget-critical)

| Component | Recommended | Est. Monthly Cost | Why |
|-----------|-------------|--------------------|-----|
| Frontend + API hosting | Vercel Pro | $20/mo (1 seat) | Hobby tier's ToS requires non-commercial use and caps function timeout at 300s regardless of plan; Pro removes the commercial-use ambiguity and includes $20 of usage credit, 1TB bandwidth |
| Database + Auth + Storage + geospatial + queue | Supabase Pro | $25/mo | Bundles Postgres+PostGIS, GoTrue auth (to 100K MAU), S3-compatible image storage with CDN, and `pg_cron`/`pgmq` for scraper scheduling — the single highest-leverage line item in this budget because it replaces 4-5 point solutions |
| Scraper execution (Crawlee/Playwright worker) | Small always-on VM/container (e.g. Fly.io Machine or a $5-6/mo Hetzner/DigitalOcean droplet) | $5-15/mo | Vercel serverless functions cap at 300s and are billed/throttled in ways that fight long-running headless-browser sessions; a small dedicated worker polling every 1-2hrs is both cheaper and more reliable for this specific workload |
| Residential proxy bandwidth | Pay-as-you-go provider (DataImpulse, Webshare, or similar) | $10-30/mo | Scraping Subito.it (and, best-effort, FB Marketplace) at a 1-2hr cadence for one city is a low-bandwidth workload; per-GB billing with no monthly minimum avoids overpaying for unused capacity |
| Map tiles | MapLibre GL JS + a free/cheap vector tile source (MapTiler free tier ~100K tile loads/mo, or OpenFreeMap for unlimited free self-hosted-style tiles) | $0-10/mo | Avoids Mapbox's per-load billing entirely; MapTiler's free tier or OpenFreeMap's unlimited free tiles both comfortably cover a single-city app at launch traffic |
| **Total estimate** | | **~$60-100/mo** | Fits within the stated $20-100/mo budget, with headroom concentrated in the two variable-cost items (proxies, map tiles) that scale with usage rather than being fixed |

## Installation

```bash
# Core app
npx create-next-app@latest shou-man-wu --typescript --tailwind --app
cd shou-man-wu
npm install @supabase/supabase-js next-intl maplibre-gl react-map-gl zod

# PWA
npm install @serwist/next serwist

# Push notifications (server-side)
npm install web-push

# UI components (adds files to repo, not a runtime dependency)
npx shadcn@latest init
npm install lucide-react

# Scraper worker (separate deployable, not part of the Next.js app)
mkdir scraper && cd scraper
npm init -y
npm install crawlee playwright
npx playwright install chromium
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Next.js (App Router) | SvelteKit + `vite-plugin-pwa` | If solo builder is significantly more fluent in Svelte, or wants a smaller client JS bundle out of the box — SvelteKit's PWA tooling is equally current, but the ecosystem for map + i18n + auth integrations is smaller and less battle-tested |
| MapLibre GL JS | Mapbox GL JS | If the product later needs Mapbox-exclusive features (3D terrain/globe view, Mapbox Studio pixel-level styling) and is willing to accept per-load billing — not justified for a free, no-revenue v1 |
| MapLibre GL JS | Leaflet | If map interactions stay simple (basic pins, no vector tiles/3D) and a smaller (~42KB vs ~290KB) bundle matters more than styling flexibility — Leaflet has no WebGL requirement, which also helps very old devices |
| Supabase | Firebase (Firestore + Auth + Storage) | If the team is more comfortable with a NoSQL document model — but PostGIS's native geo-radius queries are meaningfully harder to replicate well in Firestore, which matters directly for this app's core "near me" feature |
| Crawlee + Playwright | Scrapy + `curl_cffi`/`playwright-python` | If the scraper is written in Python rather than TypeScript — Scrapy is the Python-ecosystem equivalent and equally current, but splits the stack across two languages for a solo builder |
| Web Push API (VAPID) | Firebase Cloud Messaging | If/when a native Android/iOS app ships post-MVP and a single push pipeline across web + native is wanted — premature for a web-only v1 |
| Supabase Auth | Clerk | If B2B features (organizations, SAML SSO) are needed, or the team wants Clerk's more polished pre-built auth UI components and is comfortable with per-MAU billing — Clerk's pricing curve is steep past its free tier and unnecessary for this app's login-optional, consumer-only auth needs |
| Dedicated worker VM for scraper | Supabase Edge Functions only | If scrape targets could be fetched fast (<150s) without a full browser (e.g. a plain HTTP + Cheerio pass) — not viable here because Subito.it/FB Marketplace both require full JS rendering and anti-bot evasion that Edge Functions' runtime limits don't comfortably accommodate |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `next-pwa` | Unmaintained (no meaningful updates in ~2 years) and requires forcing the `--webpack` flag under Next.js 16's Turbopack-by-default dev server | Serwist (`@serwist/next`) |
| Mapbox GL JS (v2+) as the default | Proprietary license, requires an account/token, and bills per map load past 50K/mo — a variable cost the project doesn't need to take on for a free, ad-free, no-revenue product | MapLibre GL JS |
| Firebase Cloud Messaging for a web-only v1 | Adds a Google Cloud/Firebase project and vendor dependency purely to deliver notifications the standards-based Web Push API already handles for browsers | Web Push API + `web-push` (VAPID) |
| Enterprise proxy providers (Bright Data, Oxylabs) at MVP stage | $75-500/mo minimum commitments would consume most or all of the entire monthly budget before any hosting/database cost is paid | Pay-as-you-go residential proxy providers billed per GB |
| Raw Playwright (no Crawlee) for the scrapers | Leaves fingerprint spoofing, session/proxy pool management, and request queueing to be hand-built — real engineering time a solo builder doesn't have slack for | Crawlee's `PlaywrightCrawler`, which wraps Playwright with these built in |
| Running the scraper inside a Vercel serverless function/cron route | 300s hard timeout and cold-start behavior fight long headless-browser sessions; the "cron route does the scraping" pattern is explicitly discouraged in current Vercel/Next.js background-job guidance | A small dedicated always-on worker (Fly.io Machine or cheap VPS) triggered on a schedule, or a Supabase `pg_cron` + `pgmq` queue feeding it |
| Building a custom job queue with Redis/BullMQ from day one | Adds a paid Redis instance and another moving part before it's needed at this scale | `pgmq` (Postgres extension, already inside the Supabase Pro plan) for the scraper job queue |

## Stack Patterns by Variant

**If FB Marketplace scraping proves unworkable (as the project's own risk assessment anticipates):**
- Keep the exact same stack — Crawlee/Playwright architecture doesn't change, only the number of active scraper targets does
- No stack-level fallback is needed; this is a scope decision (already reflected in PROJECT.md as "stretch/secondary"), not a technology one

**If Vercel Pro's $20/mo feels avoidable early on:**
- Vercel Hobby *may* be usable pre-launch/pre-revenue since v1 has no monetization, but its ToS technically restricts Hobby to non-commercial personal use — validate this against Vercel's current terms before relying on it past a private beta, since the ambiguity itself is a risk, not just the cost

**If the solo builder wants to avoid running any dedicated VM/container:**
- Fly.io Machines can be scaled to zero between scrape runs (pay only for active minutes), which keeps the "dedicated worker" line item closer to $5/mo than a fixed always-on VPS — worth benchmarking against a flat-rate Hetzner/DigitalOcean droplet once actual scrape duration is known

**If map tile costs need to hit exactly $0/mo:**
- Use OpenFreeMap (free, unlimited, no API key) instead of MapTiler's free tier — trades some styling polish/support for zero usage ceiling; re-evaluate if custom map styling becomes a differentiator

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| next@16.2.12 | react@19.2.8, react-dom@19.2.8 | Next.js 16 requires React 19; do not mix with React 18 |
| next@16.2.12 (Turbopack default) | @serwist/next@9.5.12 | Confirm current Serwist docs for Turbopack support at implementation time — as of major community write-ups in early 2026, `@serwist/next` (webpack-based) needed the `--webpack` flag for local PWA testing in dev; a `@serwist/turbopack` variant exists for teams that need native Turbopack builds — verify which is current when this phase is implemented |
| typescript@7.0.2 | next@16.2.12 | TS 7's native compiler is a major version jump from the TS 5.x line most tooling docs assume — verify ESLint/type-aware lint plugin compatibility before locking this version at implementation time |
| maplibre-gl@6.0.0 | react-map-gl@8.1.1 | Confirm `react-map-gl`'s `maplibre` sub-import path against its current docs at implementation time — the package supports both Mapbox and MapLibre adapters and the import path differs between them |
| crawlee@3.17.0 | playwright@1.62.0 | Crawlee pins a compatible Playwright range internally; let Crawlee's own `package.json` resolve the Playwright version rather than pinning Playwright independently to avoid drift |

## Sources

- npm registry (`registry.npmjs.org`) — direct version lookups for all listed packages (HIGH confidence, official primary source)
- Context7 `/supabase/supabase` — PostGIS `<->` nearest-neighbor query pattern, geo-query extension setup (MEDIUM confidence)
- Context7 `/microsoft/playwright` — automation-detection flag behavior, headless/headed launch semantics (MEDIUM confidence)
- Web search, cross-referenced 3-5 independent sources each (MEDIUM confidence): MapLibre vs Mapbox pricing/licensing; residential proxy pricing 2026; Crawlee/Playwright anti-detection posture; Web Push API vs FCM tradeoffs; next-intl vs react-i18next; Vercel Hobby vs Pro terms/pricing; Supabase Auth vs Clerk vs Auth.js pricing; scraper cron/queue/worker architecture patterns; Supabase Storage vs Cloudinary vs UploadThing; Serwist vs next-pwa maintenance status

---
*Stack research for: Map-first free-item discovery PWA (手慢无 / ShouManWu)*
*Researched: 2026-07-26*
