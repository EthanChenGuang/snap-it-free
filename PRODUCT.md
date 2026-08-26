# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** International students, residents, and expats in Venice and Padova (Veneto) who want free household goods, furniture, and misc items without manually checking multiple marketplaces and community groups.

**Secondary:** Solo operator who configures scrape sources, schedules, translation, and moderation from an admin console.

**Usage context:** Mobile-first PWA on phone while moving through the city — browse a grid feed, filter by distance/zone/category, open map when needed, favorite items, post street finds, and receive alerts when matching listings appear.

## Product Purpose

零元 (ZeroDollar / ZeroEuro), branded **Venice Free Finds**, aggregates real free-item listings for the Veneto region. It scrapes Subito.it *regalo* listings via a database-configurable URL matrix, supplements thin supply with user-generated "street dump" posts, and presents everything in a feed-first mobile experience with search, radius/zone filters, and a secondary map view.

Success is measured by supply flow-through (listings found → claimed or acted on) and user activity (MAU, retention), not revenue. The product stays free unless explicitly opted into monetization later.

## Positioning

Hyperlocal free-item discovery for Venice and Padova that combines automated Subito ingestion, canonical category mapping across sources, distance-aware filtering, and optional UGC — in one trilingual PWA — so users do not need to manually monitor Subito, Facebook Marketplace, and community groups themselves.

## Operating Context

- **Geography:** Venice zones (Centro, Mestre, Lido) and Padova city; haversine distance filtering with km radius (1–50 km).
- **Supply pipeline:** Crawlee/Playwright scraper worker reads admin-configured URL matrix; listings auto-expire after 48 hours; incremental crawl with early-stop and periodic full refresh.
- **UGC:** Quick Post and Street Dump with in-app DM for UGC listings; scraped listings deep-link to Subito.
- **Moderation:** Community reports with auto-hide threshold.
- **Notifications:** Push notifications with badge fallback; keyword + zone alerts; Do Not Disturb quiet hours.
- **i18n:** Chinese (default), English, Italian — all user-facing strings in all three locales.
- **Admin:** Stitch-aligned `/admin` console for sources, scheduler, run history, translation queue, allowlist, proxy configuration.
- **Deploy target (pending):** Vercel (Next.js PWA) + Fly.io (scraper worker) + external cron for alert matcher.

## Capabilities and Constraints

### Shipped (v1.0)

- Subito scraper with zone tagging, free-filter, soft-block alerts, 34-URL Regalo matrix
- Map-first browse (legacy IA), bottom sheet, zone/category filters, 48h expiry
- UGC Quick Post + Street Dump, in-app DM, community reports, auto-hide moderation
- Auth-gated favorites, keyword+zone alerts, push notifications, iOS A2HS onboarding
- Register-first auth gates (detail preview wall, favorites/post nav) — Phase 19 pending
- Trilingual UI with locale-aware push fan-out
- Operator admin console

### Shipped (v2.0 consumer UX)

- Feed-first grid home at `/` with bottom nav: Home · Favorites · Settings
- Post via menu/drawer (not a primary tab); map via top-right location button
- Filter bottom sheet (km radius + categories), active filter pills, distance on cards
- Canonical category mapping across Subito, UGC, and title inference (17 Subito regalo slugs)
- Select Location full-screen map picker for filter center and UGC coordinates
- Settings: DND, delete account, alerts, zone, appearance, iOS A2HS — Stitch restyled
- Scraper crawl efficiency (JSON extract, incremental skip, proxy ADR) and proxy cost optimization phases

### Pending

- Production deploy: Vercel PWA, Fly.io worker, OAuth redirect URLs, external cron, D-19 smoke checklist (DEPLOY-01–05)
- PROXY-C02: 7-day direct-crawl production spike with block-rate decision gate
- PROXY-C05: ADR 015 cost ladder addendum from measured block rate
- TD-02: Physical iPhone standalone push QA sign-off
- TD-03: Google OAuth production redirect URLs verified end-to-end

### Explicitly out of scope (v2.0)

- Subscription / Restore Purchase / instant-alert paywall
- Snag red theme or floating capsule nav verbatim clone
- FB Marketplace scraper (v3+ backlog)
- Native App Store / Play Store packages (PWA-first continues)
- In-app DM for scraped listings (deep-link to source retained)
- Favorites folder organization (deferred v3+)

### Technical constraints

- **Stack:** Next.js App Router PWA, Supabase (PostGIS), MapLibre, Crawlee/Playwright scraper worker, Serwist service worker, Tailwind v4, Radix/shadcn restyled to Stitch tokens.
- **Backend:** Retain v1 Supabase listings, favorites API, alerts, push, UGC, admin schemas.
- **Budget:** $20–100/month for proxies, maps, hosting.
- **Team:** Solo builder with AI assistance.
- **Known tech debt:** FCFS DM race condition; Nyquist validation unreconciled in some phases.

### Terminology

- **Street dump:** User-generated post of items found on the street or given away locally.
- **Regalo:** Subito.it free-gift listing category.
- **Zone chips:** Venice neighborhood filters (Centro / Mestre / Lido).

## Brand Commitments

- **Product name:** 零元 — also referenced as ZeroDollar / ZeroEuro; public subtitle **Venice Free Finds**.
- **Voice:** Practical, local, community-oriented; trilingual with Chinese as default locale.
- **Visual authority:** Google Stitch design system only — documented at `.planning/google-stitch-ui-design/DESIGN.md`. Snag-style reference screenshots inform interaction patterns, not visual cloning.
- **Free principle:** Product remains free; no monetization unless explicitly opted in later.
- **Monochrome document-first aesthetic:** Thin borders, Inter typography, Material Symbols Outlined — enforced in workspace UI rules.

## Evidence on Hand

- Live codebase (~70k LOC) with v1.0 tag at commit `4c13472`.
- Real Subito.it scraped listings for Venice and Padova via configurable URL matrix.
- GSD planning artifacts: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`.
- Design system and screen prototypes: `.planning/google-stitch-ui-design/`.
- Snag-style screenshots in workspace assets (interaction benchmarks only).
- Legal note: `docs/legal/subito-scraping-note.md`.
- **Do not fabricate:** testimonials, customer logos, download counts, App Store ratings, or pricing claims.

## Product Principles

1. **Real supply first** — Show actual free listings from Subito and verified UGC; never invent inventory or social proof.
2. **Register-first growth** — Guests browse the feed and filters without an account; login is required for full listing detail, favorites, posting, messaging, alerts, and other actions that build the registered user base (see `.planning/AUTH-GATE-SPEC.md`).
3. **Local beats generic** — Distance, zone, and city filters reflect how people actually move through Venice and Padova.
4. **Stay free** — Validate through usage and retention before any paywall or subscription.
5. **Operator-maintained pipeline** — Scraping, translation, and moderation are first-class admin workflows, not afterthoughts.

## Accessibility & Inclusion

- Mobile-first PWA with iOS Add-to-Home-Screen onboarding flow.
- Trilingual UI (zh / en / it) for international student and expat audiences.
- No formal WCAG conformance level established; future work should preserve keyboard focus, contrast from Stitch tokens, and screen-reader labels on interactive controls.
