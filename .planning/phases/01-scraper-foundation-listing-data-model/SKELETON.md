# Walking Skeleton — 手慢无 (ShouManWu) Venice Free Finds

**Phase:** 1
**Generated:** 2026-07-26

## Capability Proven End-to-End

The scraper worker fetches at least one real Subito.it Veneto regalo listing through Crawlee + Playwright, normalizes it through the Zod canonical schema, and upserts it into Supabase Postgres/PostGIS — proving the underground data layer Phase 2 will read.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scraper runtime | Separate `scraper/` deployable on always-on worker (Fly.io or Hetzner VPS) | Playwright sessions exceed Vercel serverless limits; crash domain isolation from future Next.js app (D-01) |
| Scraper framework | Crawlee 3.x + Playwright | Built-in fingerprint injection, proxy rotation, session pool — avoids hand-rolled anti-bot infra (D-03) |
| Data layer | Supabase Pro Postgres + PostGIS | Solo-builder Postgres with spatial extension; shared store for scraper writes and Phase 2 map reads (D-06, D-08) |
| Ingestion path | Worker writes directly via service-role Supabase client after Zod validation | No API middle layer at Phase 1 scale; keeps scraper autonomous (D-07) |
| Zone tagging | Turf point-in-polygon at ingestion; denormalized `zone` enum column | Map queries filter by column, not live polygon math (D-14, SCRP-03) |
| Canonical schema | Single `listings` table; `source` enum; dedup on `(source, external_id)` + content hash skip (D-09, D-10, D-11) |
| Directory layout | `scraper/` package (fetch → extract → normalize → validate → persist); `supabase/migrations/` at repo root | Matches research architecture; scraper never imported by future `app/` |
| Deployment target | Dockerized worker on Fly.io Machine or Hetzner cron host | 90-minute cron cadence; always-on for Playwright (D-02) |
| Auth | None in Phase 1 | Worker uses service role; Phase 2 adds anon key + RLS for reads |
| Operator UI | Email or Telegram soft-block alerts only (no dashboard) | SCRP-06 operator notification per UI-SPEC; audit via `scrape_runs` SQL |

## Stack Touched in Phase 1

- [x] Project scaffold — `scraper/` Node/TS package with Vitest, ESM, `.gitignore`
- [x] Database — PostGIS extension; `listings`, `scrape_runs`, `scrape_rejects` migrations
- [x] Database — at least one real write (listing upsert) and read (dedup hash lookup)
- [x] Worker pipeline — Crawlee fetch → DOM extract → Zod normalize → Supabase persist
- [x] Deployment — Dockerfile + documented env vars; cron entry (no Vercel)

## Out of Scope (Deferred to Later Slices)

- Map/list UI, WebView shell, favorites (Phase 2 — DISC-01–07)
- 48h expiry enforcement in queries/cron (Phase 2 — SCRP-04; schema field set in Phase 1)
- UGC posting, in-app DM, moderation UI (Phase 3)
- User auth, push alerts, keyword match notifications (Phase 4)
- Trilingual UI chrome (Phase 5)
- FB Marketplace scraper (SCRP-07 v2)
- Operator web dashboard for `scrape_runs` / `scrape_rejects`
- Next.js app shell (Phase 2 walking skeleton extension)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- **Phase 2:** Next.js PWA reads `listings` via Supabase anon client; map + bottom-sheet list with zone filter; 48h expiry in queries
- **Phase 3:** UGC inserts into same `listings` table with `source = 'ugc'`; photo upload + moderation
- **Phase 4:** Auth-gated favorites/alerts; Web Push notifications on new matching listings
- **Phase 5:** i18n layer over all user-facing UI chrome
