# Phase 1: Scraper Foundation & Listing Data Model - Context

**Gathered:** 2026-07-26
**Status:** Ready for planning
**Mode:** Auto-selected (--auto)

<domain>
## Phase Boundary

Phase 1 delivers a continuously running Subito.it ingestion pipeline that normalizes free listings into a canonical, zone-tagged schema stored in Postgres/PostGIS, with mislabeled "free" ads filtered at ingestion and operator alerting when the scraper soft-fails. No map UI, no user-facing app shell, no UGC posting, no auth, no notifications — only the underground data layer that Phase 2 depends on.

Requirements in scope: SCRP-01, SCRP-02, SCRP-03, SCRP-05, SCRP-06.

</domain>

<decisions>
## Implementation Decisions

### Scraper Runtime & Deployment
- **D-01:** Run the Subito scraper as a **separate deployable** on a small always-on worker (Fly.io Machine or ~$5–6/mo Hetzner/DigitalOcean droplet), not inside Vercel serverless functions — **Reversibility:** costly — moving off a dedicated worker later means re-architecting long-running Playwright sessions and proxy/session state.
- **D-02:** Schedule scraper runs on a **1–2 hour cron** (default: every 90 minutes) via the worker's cron or a lightweight scheduler — **Reversibility:** reversible.
- **D-03:** Use **Crawlee 3.x + Playwright** as the scraper framework with built-in fingerprint injection, retry/backoff, and session pool — **Reversibility:** costly — framework swap touches the entire fetch/extract layer.

### Proxy & Anti-Bot Posture
- **D-04:** Use **pay-as-you-go residential proxy rotation** (e.g., DataImpulse/Webshare tier) within the $20–100/mo budget; no enterprise proxy minimums — **Reversibility:** reversible.
- **D-05:** Separate **fetch/infrastructure** (Crawlee crawler, proxy, retries) from **extraction** (DOM parsing) so selector fixes are isolated — **Reversibility:** reversible.

### Data Store & Ingestion Path
- **D-06:** Use **Supabase Pro (Postgres + PostGIS)** as the listing store — **Reversibility:** one-way — schema, migrations, and downstream phases all anchor on this store; migration is a full replatform.
- **D-07:** Scraper worker writes **directly to Supabase** via service-role connection (not through Next.js API routes) after Zod validation — **Reversibility:** costly — adding an API ingest layer later requires auth/rate-limit design.
- **D-08:** Enable **PostGIS** extension; store geometry as `geography(Point, 4326)` plus a denormalized `zone` enum column for fast filtering — **Reversibility:** one-way — geometry column type and index strategy are migration-sensitive.

### Canonical Listing Schema
- **D-09:** Single **`listings` table** with `source` enum (`subito` | `facebook` | `ugc`); Phase 1 only inserts `source = 'subito'` — **Reversibility:** one-way — all later phases query this table shape.
- **D-10:** Dedup key: **`(source, external_id)`** unique constraint; skip re-insert on unchanged hash, upsert on changed fields — **Reversibility:** costly — changing dedup strategy risks duplicate listings in production.
- **D-11:** Core scraped fields: `id`, `source`, `external_id`, `title`, `photo_url`, `external_url`, `lat`, `lng`, `geom`, `zone`, `status`, `posted_at`, `scraped_at`, `expires_at`, `content_hash`, `raw_payload` (jsonb, optional debug) — **Reversibility:** costly — field additions are easy; removals break downstream.
- **D-12:** Set `status = 'active'` on insert; `expires_at = posted_at + 48h` computed at ingestion (expiry enforcement deferred to Phase 2 queries/cron) — **Reversibility:** reversible.
- **D-13:** Validate all scraper output through a **Zod canonical schema** before any DB write — **Reversibility:** reversible.

### Zone Tagging
- **D-14:** Maintain **three precomputed Venice zone polygons** as static GeoJSON (`centro_storico`, `mestre_marghera`, `lido_murano`); tag via point-in-polygon at ingestion using Turf — **Reversibility:** costly — zone boundary changes require re-tagging existing rows.
- **D-15:** Listings with missing/ungeocodable coordinates get `zone = null` and are **excluded from zone-filtered queries** but retained for operator review — **Reversibility:** reversible.
- **D-16:** Geocoding source for Subito listings: **parse lat/lng from listing page/map embed first**; fallback to municipality text → approximate centroid only when coords absent — **Reversibility:** reversible.

### Free-Listing Filter (SCRP-05)
- **D-17:** Filter at normalization using **Italian price/negotiation keyword rules**: reject titles/descriptions matching patterns for `€`, `euro`, `prezzo`, `trattativa`, `pagamento`, `vend`, numeric price patterns, and "non gratis"/"a pagamento" — **Reversibility:** reversible — rules can be tuned without schema change.
- **D-18:** Rejected listings are **logged to a `scrape_rejects` table** (reason, raw snippet) for operator tuning, not silently dropped — **Reversibility:** reversible.

### Soft-Block Detection & Alerting (SCRP-06)
- **D-19:** After each run, assert: (a) HTTP fetch succeeded, (b) **minimum listing count ≥ 50% of trailing 7-run median**, (c) required selectors resolve on ≥ 90% of parsed items — **Reversibility:** reversible.
- **D-20:** On validation failure, **do not persist the batch**; write a `scrape_runs` audit row with failure reason and alert operator — **Reversibility:** reversible.
- **D-21:** Operator alerts via **email (Resend/similar) or Telegram bot** — simplest channel for solo builder; no PagerDuty — **Reversibility:** reversible.

### Legal & Operational Posture
- **D-22:** Proceed with Subito scraping as the **documented MVP bet**, with explicit acknowledgment that Subito `robots.txt` forbids automated access — maintain a **legal/ops note** in repo and a **fallback supply plan** (manual seeding + accelerated UGC in Phase 3) if scraper is blocked — **Reversibility:** one-way — operational/legal posture affects go-live decision.
- **D-23:** Run a **short spike** (≤ 1 plan task) against live Subito category pages before locking selectors — validate current DOM structure and anti-bot posture — **Reversibility:** reversible.

### Claude's Discretion
- Exact proxy provider choice within pay-as-you-go budget
- Worker host choice (Fly.io vs Hetzner) within cost target
- Specific Zod schema field nullability for optional Subito fields (description, multiple photos)
- Alert channel implementation details (Telegram vs email) as long as operator is notified within 5 minutes of soft-block

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — product vision, Subito-primary strategy, budget/team constraints, key decisions table
- `.planning/REQUIREMENTS.md` — SCRP-01 through SCRP-06 requirement definitions and traceability
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, requirement mapping

### Research (stack, architecture, pitfalls)
- `.planning/research/STACK.md` — recommended Next.js + Supabase + Crawlee/Playwright + dedicated worker stack
- `.planning/research/ARCHITECTURE.md` — canonical listing schema, zone-at-ingestion pattern, scraper separation, data flows
- `.planning/research/PITFALLS.md` — Subito robots.txt/legal risk, soft-block detection, selector drift, mislabeled free listings
- `.planning/research/SUMMARY.md` — executive synthesis across research docs
- `.planning/research/FEATURES.md` — feature prioritization context

### State & Blockers
- `.planning/STATE.md` — Phase 1 blockers (Subito ToS, unverified live category structure)

</canonical_refs>

<code_context>
## Existing Code Insights

Greenfield project — no application code or `.planning/codebase/` maps exist yet.

### Reusable Assets
- None — Phase 1 establishes the foundation.

### Established Patterns (from research, to adopt)
- Separate `scraper/` package from `app/` (different runtime, crash domain)
- Shared `normalize.ts` / `dedupe.ts` in scraper package
- Single `listings` table with `source` discriminator (future UGC/FB reuse)
- Zone tagging at ingestion, not query-time

### Integration Points
- Scraper worker → Supabase Postgres (service role)
- Future Phase 2 Next.js app → same Supabase `listings` table (read-only anon/authenticated queries)
- `scrape_runs` / `scrape_rejects` audit tables → operator monitoring (no UI in Phase 1)

</code_context>

<specifics>
## Specific Ideas

- Model after Snag's aggregation mechanics but **without** paywall; scraped listings deep-link out (Phase 2), so Phase 1 must preserve `external_url` reliably.
- Venice geography makes zone polygons essential — radius-based filtering is explicitly rejected.
- Budget ceiling $20–100/mo total — Supabase Pro ($25) + worker ($5–15) + proxies ($10–30) is the target envelope.
- Solo builder — favor boring, bundled infra (Supabase) over stitching Redis/SQS/Kafka.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

### Out of Phase (noted, not acted on)
- FB Marketplace scraper (SCRP-07) — v2 / Phase stretch
- Map UI, WebView shell, favorites — Phase 2
- 48h expiry enforcement in UI/cron — Phase 2 (schema field set in Phase 1)
- UGC posting, DM, moderation UI — Phase 3
- Auth, push alerts — Phase 4
- i18n — Phase 5

</deferred>

---

*Phase: 01-Scraper Foundation & Listing Data Model*
*Context gathered: 2026-07-26 (auto mode)*
