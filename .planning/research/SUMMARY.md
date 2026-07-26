# Project Research Summary

**Project:** 手慢无 (ShouManWu) — Venice Free Finds
**Domain:** Map-first free-item discovery PWA — scraper aggregation + UGC marketplace hybrid, single-city launch (Venice, Italy)
**Researched:** 2026-07-26
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a hyperlocal, map-first "free stuff" discovery app that blends two supply models the category has so far kept separate: scraped aggregation (Subito.it, FB Marketplace as stretch) and user-generated posts. That hybrid is the project's core structural bet — it hedges the cold-start problem that sinks pure-UGC apps (Buy Nothing/Trash Nothing depend on community critical mass a small city may lack) while avoiding the thin/stale-supply and paywall trust failures that define the closest direct competitor, Snag. Experts building this exact shape of product in 2025-2026 converge on a **Next.js + Supabase monolith** (App Router PWA + Postgres/PostGIS/Auth/Storage in one bill) with **MapLibre GL JS** for zero-billing map rendering, and a **separately deployed Crawlee/Playwright worker** for scraping — never inside the same serverless deploy as the web app, since headless-browser sessions don't fit serverless timeout models.

The recommended approach is a single canonical `listings` table with a `source` discriminator (`subito` / `facebook` / `ugc`) driving all downstream behavior — contact affordance (deep-link-out vs. in-app DM), lifecycle rules (48h auto-expiry vs. reserve/mark-as-sent), and report thresholds. Venice's geography (canals, bridges, walking-only Centro Storico) is a genuine differentiator no competitor was built for: zone-based filtering (Centro Storico / Mestre-Marghera / Lido-Murano), computed once at ingestion via point-in-polygon rather than live radius queries, is both a better UX fit and a query-simplicity win. Feature scope (map+list, 48h expiry with report-to-hide, login-optional browsing, keyword+zone push, trilingual IT/EN/ZH UI) is already well-matched to competitor-validated table stakes and differentiators, with no gaps or excess scope identified.

The two dominant risks are not stack or feature risk — they're operational and trust risk. First, **Subito.it's `robots.txt` explicitly forbids scraping** (not a soft crawl-delay, a stated prohibition), so scraper uptime must be treated as a product risk with a fallback supply plan, not an assumed constant; soft blocks (HTTP 200 with stale/empty content) and selector drift compound this into an ongoing maintenance tax that must be architected for (validation harness, isolated extraction logic) from day one, not bolted on later. Second, **trust erosion mirrors Snag's own worst failure mode**: unfiltered "free"-tagged scraped listings that turn out to be negotiable or bait ads would import the exact complaint this product is positioned against, so price/text filtering and a low-friction "report not free" signal are launch-blocking, not v1.x polish. A secondary but real risk is that iOS push — the platform disproportionately used by the Chinese-student segment this app explicitly targets — requires a non-obvious Add-to-Home-Screen funnel with no automatic install prompt, meaning push must degrade gracefully to in-app badges rather than being assumed as a reliable channel.

## Key Findings

### Recommended Stack

The stack converges on **Next.js 16 (App Router) on Vercel** for the PWA/API, **Supabase (Postgres + PostGIS + Auth + Storage + pgmq)** as the single backend, and **MapLibre GL JS + react-map-gl** for mapping — chosen specifically to avoid Mapbox's per-load billing on a $20-100/mo budget with no revenue. Scraping runs on **Crawlee + Playwright** on a small dedicated always-on worker (Fly.io Machine or cheap VPS), never inside Vercel serverless functions, because 300s timeouts and cold starts fight long headless-browser sessions. Push uses the standards-based **Web Push API (`web-push`, VAPID)** rather than Firebase Cloud Messaging since there's no native app to unify with in v1. Total estimated infra cost is ~$60-100/mo, fitting the stated budget with headroom concentrated in the two usage-scaling line items (residential proxy bandwidth, map tiles).

**Core technologies:**
- Next.js 16 + React 19: full-stack PWA/API — single deploy target, native i18n routing pairs with `next-intl`, Server Components suit a content-heavy map/list feed
- Supabase (Postgres + PostGIS + Auth + Storage): bundles 5 needed services into one $25/mo plan — PostGIS gives free nearest-neighbor/radius geo queries the "near me" feature depends on
- MapLibre GL JS + react-map-gl: MIT-licensed, no usage billing, no access token — the correct default for a free product with no revenue
- Crawlee + Playwright (separate worker): automatic fingerprint spoofing and built-in retry/session/proxy management save real engineering time a solo builder doesn't have slack for
- next-intl + Serwist (`@serwist/next`): App Router-native i18n and the actively maintained PWA/service-worker toolchain (`next-pwa` is unmaintained and breaks under Turbopack)

### Expected Features

Feature research (5+ competitor products: Snag, Buy Nothing/Trash Nothing, Freebie Alerts, AllFree, Curb Alert) confirms the currently scoped feature set is correctly prioritized — no missing table stakes, no excess differentiators. The category's single most common failure across every competitor is **stale/gone listings eroding trust**, which the 48h auto-expiry + report-to-hide mechanic directly targets.

**Must have (table stakes):**
- Map view with pins + list/feed (draggable bottom sheet) — the category's primary mental model
- Photo + description per listing, distance/zone filtering, freshness/expiry signal
- Push notifications (keyword/zone alerts), one-tap claim/view path, favorites, login-optional browsing

**Should have (competitive differentiators):**
- Fully free live feed with no paywall — directly converts Snag's #1 user complaint into this product's core advantage
- Dual supply (scraped + UGC) in one map — no reviewed competitor combines both
- Venice zone model (Centro Storico / Mestre-Marghera / Lido-Murano) instead of generic radius — no competitor was built for a bridge/canal city
- "Street Dump" sub-30-second quick-pin posting, in-app DM + FCFS/reserve (UGC only), trilingual IT/EN/ZH UI, in-app WebView shell for scraped listings

**Defer (v2+):**
- FB Marketplace scraper (best-effort stretch, not launch-blocking), instant-alerts subscription tier, local ad partnerships, native mobile app, reputation/trust scoring — all correctly gated behind post-validation signal, not needed for MVP

### Architecture Approach

The system splits into three cleanly separated concerns: an **ingestion layer** (scraper workers → normalizer/dedup → zone tagger, deployed independently from the web app so a scraper crash or IP ban never takes the PWA down), a **single Postgres/PostGIS listing store** shared by scraped and UGC content via a `source` discriminator, and a **Next.js application layer** (map/list UI, UGC posting flow, optional auth, alert matcher, report/moderation service, i18n). Notification fan-out uses a lightweight DB-outbox pattern (event row + poller) rather than a message broker — appropriately sized for single-city, thousands-not-millions-of-listings scale, with Redis+BullMQ as an explicit, deferred upgrade path.

**Major components:**
1. Scraper workers (Subito primary, FB stretch, isolated crash domains) — fetch + survive anti-bot defenses, hand off raw data
2. Normalizer/Dedup + Zone Tagger — canonical schema mapping, external-ID dedup, point-in-polygon zone assignment computed once at ingestion
3. Listing Store (Postgres + PostGIS) — single source of truth, `source`-discriminated, GiST-indexed for viewport queries
4. Application layer (Map+List UI, UGC posting/DM, Auth, Alert Matcher, Report/Moderation, i18n) — all read/write paths against the shared listing store

### Critical Pitfalls

1. **Subito.it's `robots.txt` explicitly forbids scraping** — read full ToS before committing engineering time, budget for sustained adversarial response (bans, possible legal contact), and keep a non-scraping fallback supply plan; don't treat this as a technical hurdle to route around.
2. **Soft blocks silently corrupt the feed** — anti-bot systems return HTTP 200 with stale/empty content; validate output shape (minimum listing count, known-good selectors) and fail loudly via alerting, not status-code-only monitoring.
3. **Mislabeled "free" listings pollute trust** — category-tag-only filtering imports Snag's exact worst failure mode; parse price/negotiation language at ingestion and surface a prominent "report not free" signal as a launch-blocking feature, not polish.
4. **iOS push requires a non-obvious Add-to-Home-Screen funnel** — no `beforeinstallprompt`, no push from a Safari tab; design an explicit onboarding flow and graceful in-app-badge degradation for users who never install, and test end-to-end on a real iPhone (not the Simulator).
5. **The 2-report auto-hide threshold is cheaply weaponizable against UGC posters** — distinguish UGC from scraped listings when applying the threshold, log report source for rate-limiting, and give posters a way to see/contest a hidden listing.

## Implications for Roadmap

Based on combined research, suggested phase structure:

### Phase 1: Scraper Foundation & Listing Data Model
**Rationale:** The entire aggregation value proposition depends on this pipeline's legal and operational durability — it's the highest-risk dependency and must be architected resiliently before any UI is built on top of it. Also establishes the canonical `listings` schema everything else depends on.
**Delivers:** Subito.it scraper (Crawlee/Playwright, on a dedicated worker, not Vercel serverless) with proxy rotation; normalizer/dedup; zone tagger (point-in-polygon against Venice zone polygons); canonical `listings` table with `source` discriminator; shape-validation + canary + alerting harness; price/negotiation-language filtering on ingested "free" listings.
**Addresses:** Subito scraper (P1, FEATURES.md), zone taxonomy foundation
**Avoids:** Pitfall 1 (ToS/legal exposure — document review before pointing at production), Pitfall 2 (soft blocks), Pitfall 3 (selector drift — isolate fetch from extraction), Pitfall 4 (mislabeled "free" listings)

### Phase 2: Map + List Core Browsing (Scraped Listings Only)
**Rationale:** A map with no pins is a broken first-run experience — this phase requires Phase 1's data to exist, and delivers the core "find free stuff" value prop before adding posting/auth complexity.
**Delivers:** Map-first home screen (MapLibre GL JS + react-map-gl, pin clustering), draggable bottom-sheet list, zone-based filtering, in-app WebView shell for scraped listings (favorite/share/back, deep-link out, no in-app contact), login-optional browsing, 48h auto-expiry job with monitoring/alerting.
**Uses:** MapLibre GL JS, react-map-gl, Supabase Postgres/PostGIS
**Implements:** Map+List UI component, WebView shell, Zone/Geocode Tagger consumption
**Avoids:** Pitfall 8 (GPS/pin accuracy in Centro Storico — show accuracy radius, snap zone classification to curated polygons)

### Phase 3: UGC Posting + In-App DM/Reserve
**Rationale:** This is the hedge against thin scraped supply in a small market (the project's core structural bet) and must ship the report/moderation and safety UX together with posting, not bolted on afterward.
**Delivers:** UGC quick-post flow (photo+title+zone, <30s) with "Street Dump" quick-pin mode; manual pin confirm/drag-adjust (not raw auto-GPS); EXIF stripping on photo upload; in-app DM scoped strictly to `source = 'ugc'`; FCFS + reserve/mark-as-sent; report/auto-hide mechanic with UGC-vs-scraped threshold distinction and a "hidden pending review" state; in-person meetup safety messaging at first-contact and in the DM thread; rate-limiting on posting/DM-initiation.
**Addresses:** UGC quick-post + Street Dump (P1), In-app DM/reserve (P1)
**Avoids:** Pitfall 6 (gameable report mechanic), Pitfall 7 (no meetup safety owner), Pitfall 8 (Street Dump GPS confirm step)

### Phase 4: Auth, Alerts & Push Notifications
**Rationale:** Alert matching logic needs the listing data model and zone taxonomy finalized first (Phase 1-2); login is deferred to point-of-action per the login-optional browsing decision, so auth naturally sequences alongside the first feature that actually requires it.
**Delivers:** Supabase Auth (Google/Apple/email, session-optional, gated only at contact/alert/favorite/post); DB-outbox event row + poller for alert matching; keyword+zone saved alerts; `web-push` (VAPID) sending; explicit iOS Add-to-Home-Screen onboarding flow with `display-mode: standalone` detection; in-app "new match" badge fallback for non-installed users.
**Uses:** Supabase Auth, web-push, Serwist/PWA install flow
**Implements:** Auth gating, Alert Matcher/Notification Service
**Avoids:** Pitfall 5 (iOS push funnel failure — test end-to-end on a real iPhone, not Simulator)

### Phase 5: i18n (Italian / English / Chinese)
**Rationale:** i18n is additive, not a dependency of anything else — it enhances every feature above without blocking any, and can ship incrementally (IT+EN before ZH if time-boxed) once the core interaction flows are stable.
**Delivers:** `next-intl` with `[locale]` route segment (it default, en, zh), per-locale message files, verification that actual listing content (not just UI chrome) is usable for non-Italian-speaking users.
**Uses:** next-intl

### Phase Ordering Rationale

- Scraper foundation must precede the map UI because a map with no pins is a broken first-run experience — data existence is a hard sequencing dependency, not a preference.
- UGC posting is sequenced after core browsing (not before) so the shared `listings` schema and zone taxonomy are already proven against real scraped data before UGC reuses them.
- Auth/alerts is deliberately sequenced after both supply sources exist, since alert-matching needs a stable, populated schema to test against meaningfully.
- i18n is placed last by design per its own dependency analysis (additive, non-blocking) — but nothing prevents pulling it earlier if translation work can happen in parallel with feature phases.
- Safety UX (meetup guidance, EXIF stripping, GPS confirm) is folded directly into Phase 3 rather than a separate "trust & safety" phase, because research explicitly warns these are "looks done but isn't" gaps that must ship alongside posting/DM, not retrofitted after an incident.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Scraper Foundation):** Subito.it's current "regalo/free" category structure and actual anti-bot posture were not directly verified (live scraping was out of scope for this research pass) — needs a spike before committing to selector/extraction design. Also needs a documented ToS/robots.txt legal review before production traffic.
- **Phase 4 (Auth, Alerts & Push):** iOS PWA push behavior is a fast-moving, regulatory-sensitive area (EU DMA compliance affecting standalone-mode availability) — verify current behavior against WebKit's official docs at implementation time, not just this research snapshot.

Phases with standard patterns (skip research-phase):
- **Phase 2 (Map + List Core):** MapLibre/react-map-gl/PostGIS geo-query patterns are well-documented and directly verified against official docs (Supabase PostGIS guide, MapLibre ecosystem).
- **Phase 5 (i18n):** next-intl's App Router locale-routing pattern is a standard, well-documented integration.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Package versions verified directly against npm registry (HIGH); pricing/architecture recommendations cross-referenced across 3+ independent sources (MEDIUM) |
| Features | MEDIUM | Cross-referenced 5+ competitor app-store listings/reviews; no first-party analytics or user interviews available |
| Architecture | MEDIUM | No single official "reference architecture" exists for this exact niche, but each sub-system (scraping pipelines, geospatial storage, PWA push, UGC moderation, i18n) has convergent, well-established patterns across independent sources |
| Pitfalls | MEDIUM-HIGH | Scraper/legal/PWA findings verified against primary sources (Subito's own robots.txt, WebKit official docs, court filings); UX/behavioral findings drawn from cross-referenced community reports |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- Subito.it's live "free" category structure and current anti-bot posture were not directly tested (out of scope for this research pass) — resolve with a spike at the start of Phase 1 before committing to scraper implementation details.
- No Venice-market-specific user behavior data exists (actual willingness to walk across bridges, real FB group activity levels in Venice) — flag for a soft-launch survey or phase-specific research rather than assuming behavior from general category research.
- Curb Alert's "On My Way" claim mechanic is single-sourced (vendor site only) — treat as a promising pattern to validate, not a proven one, if considered as a future differentiator.
- `@serwist/next` vs. Turbopack compatibility and TypeScript 7's tooling ecosystem maturity should be re-verified at implementation time, since both are recent major-version shifts noted as needing confirmation in STACK.md's Version Compatibility table.

## Sources

### Primary (HIGH confidence)
- npm registry (`registry.npmjs.org`) — direct version lookups for all stack packages
- Subito.it `robots.txt` (fetched directly, 2026-07-26) — explicit anti-scraping statement
- WebKit.org official blog, "Web Push for Web Apps on iOS and iPadOS" — official iOS push requirements
- Meta Platforms, Inc. v. Bright Data Ltd. court filings and rulings — legal precedent scope for FB Marketplace scraping
- Context7 `/supabase/supabase` and `/microsoft/playwright` — PostGIS geo-query patterns, Playwright automation-detection behavior

### Secondary (MEDIUM confidence)
- Web search cross-referenced 3-5+ independent sources: MapLibre vs. Mapbox pricing/licensing, residential proxy pricing 2026, Crawlee/Playwright anti-detection posture, Web Push vs. FCM, next-intl vs. react-i18next, Vercel Hobby vs. Pro terms, Supabase Auth vs. Clerk pricing, scraper cron/queue architecture patterns
- Snag, Buy Nothing/Trash Nothing, Freebie Alerts, AllFree, Curb Alert — App Store/Play Store listings and review aggregation (competitor feature analysis)
- Property-Intelligence-Pipeline & scraper-architecture GitHub references, hexproxies.com/decodo.com/apiclaw.io — resilient scraper pipeline patterns
- IAPP / EDPB Guidelines 03/2026 on web scraping — GDPR/scraping legal analysis
- rorklab.net, techvinta.com "Marketplace Trust & Safety Playbook 2026" — report-counter/auto-hide moderation thresholds

### Tertiary (LOW confidence)
- Curb Alert vendor site — single-sourced, no independent reviews found for its claim mechanic
- Venice-specific GPS-severity extrapolation from general urban-canyon multipath documentation — well-documented phenomenon generalized to Venice's canal geometry, not directly measured

---
*Research completed: 2026-07-26*
*Ready for roadmap: yes*
