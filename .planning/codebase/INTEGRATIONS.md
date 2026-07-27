# External Integrations

**Analysis Date:** 2026-07-27

## APIs & External Services

**Google Fonts (CDN):**
- Inter and Material Symbols Outlined loaded from `fonts.googleapis.com` / `fonts.gstatic.com`
- Used in: `index.html` (bundled app); same pattern in `.planning/google-stitch-ui-design/*/code.html`
- Auth: None (public CDN)
- SDK/Client: `<link>` tags only

**Google-hosted images (AI Studio / AIDA):**
- Mock listing photos, map textures, avatars from `lh3.googleusercontent.com/aida-public/...`
- Used in: `src/data/initialItems.ts`, `src/components/MapView.tsx` (background texture)
- Auth: None (public URLs embedded at generation time)
- Note: Hard-coded placeholder assets from AI Studio; not a production image pipeline

**Unsplash (CDN):**
- Fallback/sample images for post flow and some mock avatars
- Used in: `src/components/PostItemView.tsx` (`defaultSampleImages`), `src/data/initialItems.ts`
- Auth: None (public `images.unsplash.com` URLs with query params)
- Pattern: Category → default Unsplash URL when user posts without uploading

**Web Share API / Clipboard API:**
- Native share sheet when available; clipboard fallback
- Used in: `src/components/Header.tsx` (`navigator.share`, `navigator.clipboard.writeText`)
- Auth: None (browser capability)

**Subito.it / Facebook Marketplace:**
- Not integrated — Scraping is planned (Phase 1 per `.planning/REQUIREMENTS.md`) but no scraper code, fetch calls, or API clients exist in repo

**Google Gemini API:**
- Not integrated in application code — `@google/genai` is a declared dependency and `GEMINI_API_KEY` is documented in `.env.example` / `metadata.json` (`MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`), but `src/` contains no Gemini client usage
- Intended for AI Studio hosting scaffold only

## Data Storage

**Databases:**
- Not detected — No Postgres, Supabase, SQLite, or other DB client in codebase
- Planned: Supabase Postgres + PostGIS per `.planning/phases/01-scraper-foundation-listing-data-model/01-RESEARCH.md` (not implemented)

**Browser localStorage:**
- Primary data store for the UI-only draft
- Keys and owners:
  - `shoumanwu_items` — Listing array (`src/App.tsx`)
  - `shoumanwu_zones` — Alert zone config (`src/App.tsx`)
  - `shoumanwu_settings` — Language, push/sound toggles, appearance (`src/App.tsx`)
  - `shoumanwu_messages` — Per-item chat threads (`src/App.tsx`)
- Connection: Synchronous browser API; no env vars

**File Storage:**
- Local filesystem only (client-side) — `FileReader.readAsDataURL` for photo preview in `src/components/PostItemView.tsx`
- No cloud upload (Supabase Storage, S3, etc.) implemented
- Posted items use data URLs or external image URLs; nothing is persisted to a server

**Caching:**
- None — No Redis, service worker cache, or HTTP cache layer
- Vite dev server default caching only

## Authentication & Identity

**Auth Provider:**
- Not detected — No Google/Apple/email sign-in, OAuth, JWT, or session management
- UI simulates owners with hard-coded mock profiles in `src/data/initialItems.ts`
- Planned: Supabase Auth (Google/Apple/email) per `.planning/REQUIREMENTS.md` AUTH-01/02 (Phase 4)

## Monitoring & Observability

**Error Tracking:**
- None — No Sentry, LogRocket, or similar

**Logs:**
- `console.error` on `localStorage` JSON parse failures in `src/App.tsx`
- No structured logging or log shipping

## CI/CD & Deployment

**Hosting:**
- **Current:** Local Vite dev server; static `dist/` build suitable for any static host
- **Origin platform:** Google AI Studio / Cloud Run (referenced in `.env.example` `APP_URL` comment and `README.md`)
- **Planned:** Vercel Pro for frontend/API per `.planning/research/STACK.md` (not configured — no `vercel.json`, no GitHub Actions)

**CI Pipeline:**
- Not detected — No `.github/workflows/` or other CI config

## Environment Configuration

**Required env vars (documented, not consumed by `src/`):**
- `GEMINI_API_KEY` — Gemini API (AI Studio; `.env.example`)
- `APP_URL` — Hosted applet URL for OAuth/API callbacks (AI Studio; `.env.example`)

**Optional env vars:**
- `DISABLE_HMR` — Disables Vite HMR when `true` (`vite.config.ts`)

**Secrets location:**
- `.env.local` / `.env*` (gitignored) per `README.md` and `.gitignore`
- AI Studio Secrets panel for cloud deployment (per `.env.example` comments)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None — No server-side HTTP clients, webhooks, or third-party API calls from application code

## Map & Geolocation

**Map rendering:**
- Not integrated — No MapLibre, Mapbox, Leaflet, or Google Maps SDK
- `src/components/MapView.tsx` uses SVG grid overlay + static background image URL; pins positioned by index math, not lat/lng projection

**Geolocation:**
- Permission declared in `metadata.json` (`requestFramePermissions: ["geolocation"]`)
- Not called in `src/` — Post flow uses hard-coded location text (`PostItemView.tsx`: `"Jing'an District, Shanghai"`) and mock lat/lng in `initialItems.ts`
- Planned: GPS quick-pin for UGC (`UGC-02`) and zone polygons at ingestion (Phase 1/3)

## Push Notifications

- Not integrated — Settings UI toggles `pushNotifications` in local state only (`src/types.ts`, `src/components/SettingsView.tsx`)
- No Web Push / VAPID, FCM, or service worker subscription code
- Planned: Web Push API + `web-push` server sender per `.planning/REQUIREMENTS.md` NOTF-02 (Phase 4)

## Internationalization

- Not integrated — Language setting stored in `AppSettings.language` (`'zh' | 'en' | 'it'`) but UI strings are hard-coded English/Chinese mix
- No `next-intl`, `react-i18next`, or locale routing
- Planned: IT/EN/ZH full UI translation per `.planning/REQUIREMENTS.md` I18N-01/02 (Phase 5)

## Planned Integrations Summary

The following are specified in `.planning/REQUIREMENTS.md` and `.planning/research/STACK.md` but **not present in the codebase**:

| Integration | Purpose | Planned client/package |
|-------------|---------|------------------------|
| Supabase (Postgres + PostGIS) | Listings store, geo queries | `@supabase/supabase-js` |
| Supabase Auth | Google/Apple/email login | Supabase GoTrue |
| Supabase Storage | UGC photo uploads | Supabase Storage API |
| Subito.it (via Crawlee + Playwright) | Scraped free listings | `crawlee`, `playwright` on dedicated worker |
| Residential proxy provider | Anti-bot IP rotation | Crawlee `ProxyConfiguration` |
| MapLibre GL JS + react-map-gl | Interactive map pins | `maplibre-gl`, `react-map-gl` |
| Map tile provider (MapTiler / OpenFreeMap) | Vector/raster tiles | HTTP tile URLs |
| Web Push (VAPID) | Keyword + zone alerts | `web-push`, Push API |
| Serwist | PWA service worker | `@serwist/next` (when migrating to Next.js) |
| Operator alerts | Scraper soft-block notification | Resend email or Telegram bot |
| Vercel | Frontend/API hosting | Platform deploy |

## External URL Dependencies (Runtime)

The running app fetches third-party assets at runtime:

| Host | Usage | Files |
|------|-------|-------|
| `fonts.googleapis.com` | Inter, Material Symbols CSS | `index.html` |
| `fonts.gstatic.com` | Font files (preconnect) | `index.html` |
| `lh3.googleusercontent.com` | Mock images, map background | `src/data/initialItems.ts`, `src/components/MapView.tsx` |
| `images.unsplash.com` | Sample/post placeholder images | `src/data/initialItems.ts`, `src/components/PostItemView.tsx` |

**Design reference only (not bundled):**
- `cdn.tailwindcss.com` — Used in `.planning/google-stitch-ui-design/*/code.html` static prototypes

---

*Integration audit: 2026-07-27*
