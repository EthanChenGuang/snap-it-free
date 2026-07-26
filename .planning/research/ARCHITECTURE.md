# Architecture Research

**Domain:** Map-first free-item listing aggregation PWA (scraped + UGC marketplace hybrid)
**Researched:** 2026-07-26
**Confidence:** MEDIUM (cross-referenced web sources; no single official "reference architecture" exists for this exact niche, but each sub-system — scraping pipelines, geospatial storage, PWA push, UGC moderation, i18n — has well-established, convergent patterns across independent sources)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                      INGESTION (separate deployable)                 │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐   ┌────────────┐   ┌───────────────┐  ┌───────────┐  │
│  │  Subito.it │   │ FB Market- │   │  Normalizer /  │  │  Zone /   │  │
│  │  Scraper   │──▶│ place      │──▶│  Deduplicator  │─▶│  Geocode  │  │
│  │  (worker)  │   │ Scraper    │   │  (canonical    │  │  Tagger   │  │
│  │            │   │ (stretch)  │   │   schema)      │  │           │  │
│  └────────────┘   └────────────┘   └───────┬────────┘  └─────┬─────┘  │
│                                             │                  │       │
├─────────────────────────────────────────────┴──────────────────┴─────┤
│                          LISTING STORE (Postgres + PostGIS)          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  listings (source, geom, zone, status, expires_at, ...)      │    │
│  │  users · alerts · reports · conversations (UGC only)         │    │
│  └───────────────────┬──────────────────────────┬───────────────┘    │
├──────────────────────┴──────────────────────────┴────────────────────┤
│                     APPLICATION LAYER (Next.js PWA)                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────────────────┐ │
│  │ Map+List  │  │  UGC Post │  │  Auth     │  │  Alert Matcher /   │ │
│  │ UI + Web- │  │  Flow     │  │  (optional│  │  Notification Svc  │ │
│  │ View shell│  │  + DM     │  │  gates)   │  │  (web-push→FCM/APNs)│ │
│  └───────────┘  └───────────┘  └───────────┘  └────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │        Report/Moderation Service (counter → auto-hide)         │  │
│  └────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│                    i18n LAYER (next-intl, it/en/zh)                  │
└────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Scraper workers (Subito primary, FB stretch) | Fetch third-party listing pages, survive anti-bot defenses, hand off raw data | Node/Python + Playwright or lightweight HTTP client, run as own deployable (own crash domain), proxy rotation, per-domain rate limiting |
| Normalizer / Deduplicator | Map raw scraped fields → canonical listing schema; skip re-inserting listings already seen (external ID / content hash) | Pure functions in a shared package imported by scraper workers; hash of (source, external_id) as dedup key |
| Zone / Geocode Tagger | Convert address/lat-lng into one of the three Venice zones (Centro Storico / Mestre-Marghera / Lido-Murano) via point-in-polygon, since GPS radius alone is misleading in a bridge/walking city | Precomputed zone polygons (GeoJSON) + PostGIS `ST_Contains`, run once at ingestion, cached on the row |
| Listing Store | Single source of truth for both scraped and UGC listings, with a `source` discriminator driving UI/contact behavior | PostgreSQL + PostGIS extension (Supabase-hosted is a strong lean-budget fit: Postgres + Auth + Storage + Realtime in one bill) |
| Map + List UI | Render pins + draggable bottom-sheet list, zone filter, favorites | MapLibre GL JS + MapTiler (or self-hosted) vector tiles; React/Next.js |
| WebView shell (scraped listings) | Show source listing in-app with top bar (favorite/share/back), then deep-link out — no in-app contact | `<iframe>`/in-app browser view wrapping the source URL |
| UGC Posting Flow | Quick-post (photo+title+zone) and Street Dump quick-pin, under 30s | Client form + image upload to object storage, geolocation capture |
| In-app DM / Reserve flow | First-come-first-served contact + seller mark-as-sent — **UGC listings only** | Simple threaded messages table scoped to `listing_id`, no need for a generic messaging platform |
| Auth | Optional login; only required to gate contact-seller / alerts / favorite / post actions | Supabase Auth or Auth.js — Google/Apple/email providers, session-optional middleware |
| Report / Moderation Service | Increment report counter per listing, soft-mute for reporter, auto-hide at threshold | Counter column/Redis key + status flip; event-driven so reporting stays available even if a deeper review queue backs up |
| Alert Matcher / Notification Service | On new listing insert, match against saved keyword+zone alerts, send push | DB "outbox" event row → lightweight poller/worker → `web-push` npm library (VAPID) → FCM (Chrome/Android) / APNs (iOS Safari, PWA-installed only) |
| i18n Layer | Italian (default), English, Chinese toggle | `next-intl` with `[locale]` route segment + per-locale JSON message files |

## Recommended Project Structure

```
app/                              # Next.js App Router (PWA shell)
├── [locale]/                     # next-intl locale segment (it default, en, zh)
│   ├── (map)/
│   │   ├── page.tsx              # map-first home: pins + bottom sheet list
│   │   └── listing/[id]/page.tsx # detail: WebView shell (scraped) or full page (UGC)
│   ├── post/                     # UGC quick-post + Street Dump pin flow
│   ├── alerts/                   # saved keyword+zone alert management
│   ├── favorites/
│   └── auth/                     # login/callback screens
└── api/
    ├── listings/                 # geo-query endpoints (bbox / zone / nearby)
    ├── reports/                  # report submission → counter → auto-hide
    ├── alerts/                   # alert CRUD + push subscription endpoint
    ├── messages/                 # UGC in-app DM
    └── ingest/                   # internal endpoint scraper workers can call (or write direct-to-DB, see Patterns)

lib/
├── db/                           # Postgres/PostGIS client + typed queries
├── geo/                          # zone polygons, point-in-polygon, distance helpers
├── notifications/                # web-push sending, VAPID keys, alert matcher
└── i18n/                         # next-intl routing/request config

components/
├── map/                          # MapLibre wrapper, clustering, bottom sheet
├── listing/                      # card, detail, webview shell
└── ugc/                          # post form, street-dump pin mode

messages/
├── it.json
├── en.json
└── zh.json

scraper/                          # SEPARATE deployable — own package.json/runtime
├── subito/                       # Subito.it scraper (primary)
├── facebook/                     # FB Marketplace scraper (stretch, isolated worker)
├── shared/normalize.ts           # raw → canonical listing schema
├── shared/dedupe.ts              # external_id/content-hash dedup
└── worker.ts                     # cron entrypoint (1-2hr cadence)
```

### Structure Rationale

- **`scraper/` is a separate deployable from `app/`:** it needs a different runtime (headless browser, proxy config, longer-running processes) and has a fundamentally different risk profile (gets IP-banned, breaks on site redesigns). Isolating it means a scraper crash or ban never takes the user-facing PWA down, and it can be redeployed/restarted independently.
- **One `listings` table, `source` discriminator:** scraped and UGC listings share almost all fields (title, photo, geom, zone, status, expiry). Branching UI/contact behavior on a `source` enum (`subito` / `facebook` / `ugc`) avoids maintaining two parallel data models and keeps the map/list query simple (one table, one geo-index).
- **`lib/geo/` as its own module:** zone tagging (point-in-polygon against the 3 Venice zone polygons) is a genuinely distinct concern from generic PostGIS distance queries and Venice's geography (bridges, walking-only Centro Storico) makes it worth isolating and testing on its own.

## Architectural Patterns

### Pattern 1: Canonical Listing Schema with Source Discriminator

**What:** One `listings` table for scraped and UGC content, with a `source` column (`subito` | `facebook` | `ugc`) that the application layer uses to decide contact affordances (deep-link-out vs in-app DM) and lifecycle rules (48h auto-expiry vs manual/reserve).
**When to use:** Any aggregator that mixes "content we don't own" with "content users create directly" — this is the core shape of this project per `PROJECT.md`.
**Trade-offs:** Simpler queries and a single map/list rendering path vs. needing nullable/conditional columns (e.g. `contact_thread_id` only meaningful for `source = 'ugc'`).

**Example:**
```typescript
type Listing = {
  id: string;
  source: 'subito' | 'facebook' | 'ugc';
  title: string;
  photoUrl: string;
  geom: { lat: number; lng: number };
  zone: 'centro_storico' | 'mestre_marghera' | 'lido_murano';
  status: 'active' | 'claimed' | 'expired' | 'hidden';
  externalUrl?: string;      // only for source !== 'ugc'
  expiresAt: Date;           // scraped: scrapedAt + 48h; UGC: user-set or default
  reportCount: number;
};
```

### Pattern 2: Zone Tagging at Ingestion (Precomputed, Not Query-Time)

**What:** Compute which of the 3 Venice zones a listing belongs to once, at ingestion/geocode time, using point-in-polygon against fixed GeoJSON zone boundaries — store it as a plain column, not a computed value.
**When to use:** Whenever "zone" is a first-class filter in the UI (as it is here) and the boundaries don't change often. Venice's geography (canals, bridges, islands) means a naive radius ("within 2km") misrepresents actual reachability — a straight-line 2km can cross water.
**Trade-offs:** Requires maintaining zone polygon GeoJSON as a small static asset; pays off immediately in query simplicity (`WHERE zone = 'centro_storico'` beats a live polygon check on every list request).

**Example:**
```typescript
import { booleanPointInPolygon } from '@turf/turf';

function tagZone(lat: number, lng: number, zones: ZonePolygon[]): Zone | null {
  const point = [lng, lat];
  return zones.find(z => booleanPointInPolygon(point, z.polygon))?.id ?? null;
}
```

### Pattern 3: DB Outbox for Notification Matching (Skip the Message Broker)

**What:** Instead of standing up Kafka/SQS for "new listing → match alerts → push," write an event row to a small `listing_events` table on insert; a lightweight interval-poller (or Postgres `LISTEN/NOTIFY`) picks it up, matches against saved keyword+zone alerts, and sends push via `web-push`.
**When to use:** Solo-builder, lean-budget projects at the scale described (a single city, thousands not millions of listings/day). A full message broker is operationally heavier than the problem justifies here.
**Trade-offs:** Slightly higher latency than a true broker (seconds, not milliseconds — acceptable for "new free item nearby" alerts) vs. zero extra infrastructure cost or ops burden. Upgrade to Redis+BullMQ only if polling latency or volume becomes a real problem (see Scaling Considerations).

## Data Flow

### Scraper → Listing Flow

```
[Subito.it page]
    ↓ (Playwright/HTTP, rate-limited, proxy-rotated)
[Scraper worker] → [Normalizer: raw → canonical schema] → [Dedup check: external_id/hash]
    ↓ (new/changed listings only)
[Zone Tagger: point-in-polygon] → [Listing Store: INSERT, status=active, expires_at=+48h]
    ↓
[listing_events row written] → [Alert Matcher] → [Push to matching users]
    ↓
[Map + List UI reads via geo-query API]
```

### UGC Post Flow

```
[User: quick-post form / Street Dump pin]
    ↓
[Photo → object storage] → [Listing Store: INSERT, source=ugc, status=active]
    ↓
[listing_events row] → [Alert Matcher] → [Push to matching users]
    ↓
[Buyer taps listing] → [In-app DM thread] → [Seller: reserve / mark-as-sent]
```

### Report / Auto-Hide Flow

```
[User taps "claimed/expired" report] → [Soft-mute for reporter] → [Increment report_count]
    ↓ (report_count >= threshold, per PROJECT.md: 2)
[Listing status → hidden] → [Removed from active map/list queries]
```

### Key Data Flows

1. **Ingestion → Discovery:** Scraper output and UGC posts both converge on the same `listings` table before reaching the map/list UI — the UI never needs to know which pipeline a listing came from except to decide contact affordance.
2. **Listing → Alert:** Every new/updated active listing generates one event that fans out to N interested users (via saved alerts), decoupled from the insert path so a notification backlog never blocks new listings from appearing.
3. **Report → Visibility:** Report counting is a side-channel that only mutates `status`; it never deletes data, preserving an audit trail and allowing appeal/undo later.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users (launch/validation — realistic near-term ceiling for a single-city product) | Single Next.js app + Supabase Postgres/PostGIS/Auth/Storage; one scraper worker on a small VPS or cron-triggered job; DB-polling outbox is plenty fast |
| 1k–10k users (aspirational city-wide adoption across Venice/Mestre/Lido) | Split scraper worker fully off the web app's deploy (it already should be architecturally); introduce Redis+BullMQ if scrape concurrency or notification fan-out volume causes DB polling lag; add PgBouncer/connection pooling (Supabase provides this) |
| 100k+ users | Not a realistic near-term target for a single-city, free-item niche app (Venice metro population is ~250k) — this tier is included per template convention but should not drive early design decisions. If ever relevant, it implies multi-city expansion (re-architect around a `city`/tenant dimension), not raw user-count scaling of Venice alone |

### Scaling Priorities

1. **First bottleneck: scraper reliability, not traffic.** The single biggest risk to this architecture is Subito.it/FB Marketplace defenses breaking the scraper — this determines supply, which determines everything else. Invest in resilient scraper architecture (queue + retry + backoff + observability) before worrying about read-side scaling.
2. **Second bottleneck: geospatial query cost at high pin density during a live map pan/zoom.** Mitigate with PostGIS GiST index + bounding-box queries scoped to the visible map viewport, and client-side pin clustering, well before this becomes an issue at Venice's scale.

## Anti-Patterns

### Anti-Pattern 1: Monolithic Scraper Script With No Queue/Retry Layer

**What people do:** A single script loops over target pages and writes straight to the database with no retry, backoff, or dead-letter handling.
**Why it's wrong:** The moment Subito.it rate-limits, changes its HTML, or an IP gets flagged, the whole pipeline silently stops producing new listings — and nothing alerts you. This is the most commonly cited failure mode in scraper-dependent products.
**Do this instead:** Even a lean version needs: per-domain rate limiting, exponential backoff with jitter on failure, and a simple health/last-successful-run metric surfaced somewhere you'll actually see it (e.g. a `/admin` status page or an alert if no new listings appear within an expected window).

### Anti-Pattern 2: Building In-App Messaging for Scraped Listings

**What people do:** Once a DM system exists for UGC, it's tempting to "just reuse it" for scraped listings too.
**Why it's wrong:** You don't own the scraped listing or its seller relationship — you'd be building a support/trust surface for content you can't moderate or verify, and it contradicts the project's own explicit decision to deep-link out for non-UGC content.
**Do this instead:** Keep the `source` discriminator authoritative: only `source = 'ugc'` listings ever get a `conversation_id`; scraped listings only ever get an `externalUrl` and the WebView shell.

### Anti-Pattern 3: Radius-Only "Nearby" Search in a Bridge/Canal City

**What people do:** Use straight-line GPS distance (`ST_DWithin` radius) as the only "near me" signal, as most map apps do by default.
**Why it's wrong:** In Centro Storico, a listing 300m away in a straight line can be a 15-minute walk around canals and bridges — a pure radius search will surface "nearby" items that are actually far in practice, undermining user trust in the core value prop.
**Do this instead:** Use the precomputed zone tag (Pattern 2) as the primary filter, with radius/distance sort as a secondary refinement within a zone — not the other way around.

### Anti-Pattern 4: Treating Push Notifications as a Guaranteed Delivery Channel

**What people do:** Design the alert feature assuming push always arrives promptly.
**Why it's wrong:** iOS Safari PWA push (the majority mobile browser for many users) only works after a manual "Add to Home Screen" step, requires a same-session user gesture to request permission, and has documented reliability rough edges (silent unsubscribes, missed events after device restart); EU iOS 17.4+ users may lose PWA push entirely under current Apple DMA compliance behavior.
**Do this instead:** Treat push as a best-effort re-engagement channel. Provide an onboarding nudge to "Add to Home Screen" before offering the push opt-in, detect `display-mode: standalone` before prompting, and consider a fallback (e.g. an in-app "new matches" badge or optional email digest) for users who never install.

### Anti-Pattern 5: Auto-Hiding Content on a Single Report

**What people do:** Hide a listing the moment any one user reports it.
**Why it's wrong:** A 1-report threshold is trivially weaponizable — a competitor or bad actor can suppress legitimate listings. Industry practice for small marketplaces converges on a small-but-plural threshold.
**Do this instead:** Note — `PROJECT.md` already specifies a 2-report auto-hide threshold, which is at the low end of common practice (3 is more typical for small communities). This is a deliberate product choice for a small-supply market where speed-to-hide claimed items matters more than abuse-resistance; if abuse becomes a problem post-launch, raising the threshold or adding a lightweight reporter-reputation weight is the standard mitigation.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Subito.it | Scrape (no public API) — Playwright or HTTP client, proxy rotation, ~1-2hr cadence per `PROJECT.md` | Primary supply source; treat as the highest-risk dependency, build resilience first |
| Facebook Marketplace | Scrape (stretch/secondary) — isolate as its own worker so its (likely more frequent) failures never affect the Subito pipeline | Heavier anti-bot defenses; budget for this to be unreliable and don't block launch on it, per `PROJECT.md` |
| MapLibre GL JS + tile provider (e.g. MapTiler free tier, or self-hosted) | Client-side map rendering library + hosted/self-hosted vector tiles | Zero per-load licensing fees vs. Mapbox (~$0.50/1k loads) or Google Maps (~$7/1k loads) — the right default for a $20-100/mo budget |
| Web Push (VAPID) → FCM / APNs | `web-push` library on the backend; browser `PushManager` API on the client | iOS requires PWA-installed context; see Anti-Pattern 4 |
| Object storage (e.g. Supabase Storage or Cloudflare R2) | UGC photo upload | Prefer a provider with no/low egress fees given the lean budget |
| Auth provider (Supabase Auth or Auth.js) | Google/Apple/email OAuth, session-optional | Avoids building auth from scratch; must support "browse without login, prompt only on specific actions" per `PROJECT.md` |
| Geocoding (Nominatim self-hosted, or a metered geocoding API) | Convert scraped listing addresses → lat/lng for zone tagging | Scrape volume is modest (single city), so even a metered API is likely low-cost; self-hosted Nominatim is free but adds ops overhead |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Scraper workers ↔ Listing Store | Direct DB write (shared schema/migrations package) at this scale, rather than a formal ingest API | Simpler for a solo builder; revisit only if the scraper is ever run as a fully separate/externalized service outside your infra |
| Application layer ↔ Listing Store | ORM/query layer, read-mostly geo-queries scoped to map viewport + zone filter | Keep all zone/geo logic in `lib/geo/`, not scattered across API routes |
| Listing insert ↔ Alert Matcher | DB outbox event row + poller (Pattern 3), not a message broker | Upgrade path exists (Redis+BullMQ) if volume ever demands it |
| UGC listings ↔ Messaging | `conversation_id` scoped strictly to `source = 'ugc'` listings | Never share this path with scraped listings (Anti-Pattern 2) |
| Report submissions ↔ Listing status | Counter increment + threshold check, decoupled from any future deeper review pipeline | Keeps reporting available even if a review queue backs up |

## Sources

- Property-Intelligence-Pipeline & Sam-Radnus/Crawler (GitHub, event-driven scraper→PostGIS reference architectures) — MEDIUM confidence (cross-referenced against 4+ independent scraper-architecture guides)
- Supabase PostGIS docs (`supabase.com/docs/guides/database/extensions/postgis`) — geospatial storage/query pattern, official vendor documentation
- Alibaba Cloud "Geohash vs. PostGIS" and techinterview.org geo-proximity system design posts — geospatial approach comparison
- hexproxies.com, decodo.com, voyracloud.com, apiclaw.io (2026) — resilient scraper pipeline architecture, proxy/rate-limit/retry patterns, cross-referenced across independent sources
- appypie.com, flurryjournal.com, jeremymax.com, brocoders.com — MapLibre vs Mapbox vs Google Maps cost/licensing comparison, cross-referenced
- WebKit/browser-compat sources (web-push-notifications.com compatibility matrix, magicbell.com, derkonline.com, youngju.dev "PWA & Service Workers 2026") — iOS Safari PWA push behavior and constraints as of mid-2026
- rorklab.net, bpcustomdev.com, techvinta.com "Marketplace Trust & Safety Playbook 2026" — report-counter/auto-hide moderation pattern, industry-typical thresholds
- next-intl official docs (`next-intl.dev`) and buildwithmatija.com, nextjslaunchpad.com — Next.js App Router i18n routing pattern
- `/home/guang/Projects/Experiments/shou-man-wu/.planning/PROJECT.md` — project-specific requirements and constraints driving all recommendations above

---
*Architecture research for: Map-first free-item listing aggregation PWA*
*Researched: 2026-07-26*
