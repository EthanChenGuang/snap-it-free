# Phase 1: Scraper Foundation & Listing Data Model - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-26
**Phase:** 01-Scraper Foundation & Listing Data Model
**Mode:** --auto (all decisions auto-selected from recommended defaults)
**Areas discussed:** Scraper Runtime & Deployment, Proxy & Anti-Bot Posture, Data Store & Ingestion Path, Canonical Listing Schema, Zone Tagging, Free-Listing Filter, Soft-Block Detection & Alerting, Legal & Operational Posture

---

## Scraper Runtime & Deployment

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated always-on worker (Fly.io/Hetzner) | Crawlee/Playwright long sessions, isolated crash domain | ✓ |
| Vercel serverless cron | Same deploy as app, 300s timeout cap | |
| Local cron on dev machine | Zero cost, not production-reliable | |

**Auto choice:** Dedicated always-on worker — recommended in STACK.md; Vercel unsuitable for headless browser sessions.

[auto] Scraper Runtime — Q: "Where should the Subito scraper run?" → Selected: "Dedicated always-on worker" (recommended default)

[auto] Scraper Runtime — Q: "What refresh cadence?" → Selected: "Every 90 minutes (within 1–2hr requirement)" (recommended default)

[auto] Scraper Runtime — Q: "Which scraper framework?" → Selected: "Crawlee + Playwright" (recommended default)

---

## Proxy & Anti-Bot Posture

| Option | Description | Selected |
|--------|-------------|----------|
| Pay-as-you-go residential proxies | Fits $20–100/mo budget, rotation on ban | ✓ |
| Datacenter proxies only | Cheaper but higher ban rate on Subito | |
| No proxies (direct IP) | Simplest, fastest to IP ban | |

**Auto choice:** Pay-as-you-go residential proxy rotation.

[auto] Proxy — Q: "Proxy strategy?" → Selected: "Pay-as-you-go residential rotation" (recommended default)

[auto] Proxy — Q: "Separate fetch from extraction?" → Selected: "Yes — isolated modules" (recommended default)

---

## Data Store & Ingestion Path

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase Postgres + PostGIS | Bundled auth/storage/geo for later phases | ✓ |
| Plain Postgres on Railway | Cheaper entry but no bundled auth/storage | |
| SQLite + Turso | Too limited for PostGIS geo queries | |

**Auto choice:** Supabase Pro with direct service-role writes from scraper worker.

[auto] Data Store — Q: "Listing store?" → Selected: "Supabase Postgres + PostGIS" (recommended default)

[auto] Data Store — Q: "Ingestion path?" → Selected: "Scraper → Supabase direct (Zod-validated)" (recommended default)

---

## Canonical Listing Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Single `listings` table, source enum | Shared by scraped + future UGC | ✓ |
| Separate `scraped_listings` table | Simpler Phase 1 but merge pain in Phase 3 | |

**Auto choice:** Single table, dedup on `(source, external_id)`, Zod validation gate.

[auto] Schema — Q: "Table design?" → Selected: "Single listings table with source enum" (recommended default)

[auto] Schema — Q: "Dedup strategy?" → Selected: "(source, external_id) unique constraint" (recommended default)

---

## Zone Tagging

| Option | Description | Selected |
|--------|-------------|----------|
| Precomputed GeoJSON + point-in-polygon at ingestion | Matches Venice geography, fast queries | ✓ |
| Live radius query at read time | Misleading in bridge/water geography | |
| Manual zone assignment by operator | Doesn't scale | |

**Auto choice:** Three static Venice zone polygons, Turf tagging at ingestion, null zone if ungeocodable.

[auto] Zone — Q: "Zone tagging approach?" → Selected: "Point-in-polygon at ingestion with static GeoJSON" (recommended default)

---

## Free-Listing Filter

| Option | Description | Selected |
|--------|-------------|----------|
| Keyword/regex filter at normalization | Catches Italian price language early | ✓ |
| Post-ingestion community reports only | Lets bait ads reach users first | |
| ML classifier | Overkill for solo MVP | |

**Auto choice:** Italian keyword rules at normalization + `scrape_rejects` audit log.

[auto] Filter — Q: "How to reject mislabeled free listings?" → Selected: "Keyword/regex at normalization" (recommended default)

---

## Soft-Block Detection & Alerting

| Option | Description | Selected |
|--------|-------------|----------|
| Count + selector health vs trailing median | Catches HTTP-200 empty feeds | ✓ |
| HTTP status code only | Misses soft blocks | |
| Manual daily check | Doesn't meet SCRP-06 | |

**Auto choice:** 50% median threshold + selector health; block batch persist; email/Telegram alert.

[auto] Alerting — Q: "Soft-block detection?" → Selected: "Trailing median + selector health checks" (recommended default)

[auto] Alerting — Q: "Alert channel?" → Selected: "Email or Telegram (solo-builder)" (recommended default)

---

## Legal & Operational Posture

| Option | Description | Selected |
|--------|-------------|----------|
| Proceed with documented risk + fallback plan | MVP bet per PROJECT.md; spike first | ✓ |
| Pause until legal review complete | Delays all downstream phases | |
| Skip scraping; UGC-only launch | Violates core aggregation value prop | |

**Auto choice:** Document ToS risk, run live spike before locking selectors, maintain fallback supply plan.

[auto] Legal — Q: "Subito robots.txt forbids scraping — proceed?" → Selected: "Proceed with documented risk + spike + fallback" (recommended default)

---

## Claude's Discretion

- Proxy provider within budget
- Worker host (Fly.io vs Hetzner)
- Alert channel (Telegram vs email)
- Optional field nullability in Zod schema

## Deferred Ideas

None captured during auto session.
