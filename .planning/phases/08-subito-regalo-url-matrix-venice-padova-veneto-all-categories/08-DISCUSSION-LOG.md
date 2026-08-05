# Phase 8: Subito Regalo URL Matrix - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-05
**Phase:** 08-subito-regalo-url-matrix-venice-padova-veneto-all-categories
**Areas discussed:** Admin URL matrix UX, Padova map, Category scope, Initial seed, Category in app, listings_public view, Category chips UX, Padova spike gate, Category translation, Dedupe/usato, Region column, Admin URL warning, Chip default, Schema types, Category parser source

---

## Admin URL Matrix UX

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid | Checkboxes generate into existing textarea; manual edit allowed | ✓ |
| Structured picker only | No freeform textarea | |
| Enhanced textarea | Textarea primary with helper panel | |

**User's choice:** Hybrid matrix above textarea; URLs-only DB persistence; Veneto validation; Apply recommended seed; custom URLs coexist; dedupe on generate; Italian labels; URL count preview; static future-region hint; defaults Venice+Padova+all 17 categories.

---

## Padova Map

| Option | Description | Selected |
|--------|-------------|----------|
| Show zone=null | Padova pins when coords exist; excluded from Venice zone chips | ✓ |
| Hide from app | Ingest only | |
| Fourth zone chip | Padova / Fuori Venezia | |

**User's choice:** Show on map with zone=null; "All" filter includes Padova; city label on cards; Venice-centered viewport; coords required (no centroid); **city + region text columns at ingest** (user asked for best national-scale solution).

---

## Category Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All 17 slugs | Including animali + usato | ✓ |
| Exclude animali/usato | Object categories only | |

**User's choice:** Include animali and usato; store category slug; single worker with conservative Crawlee concurrency (Claude discretion: Standard preset, minConcurrency 1–2).

---

## Initial Seed

| Option | Description | Selected |
|--------|-------------|----------|
| Admin button only | No migration auto-seed | ✓ |
| Migration + button | | |
| Migration only | | |

**User's choice:** Keep 3-URL code fallback; confirm overwrite dialog on Apply recommended seed.

---

## Category in App

| Option | Description | Selected |
|--------|-------------|----------|
| DB category primary + filter chips | 17 Subito slug chips, Italian labels | ✓ |
| Display only | No filter | |
| Parser fix only | Keep title inference in UI | |

**User's choice:** Horizontal scroll chip row; "Tutte" default; auto-translate pipeline for category_en/zh.

---

## Additional Areas (second pass)

| Topic | Choice |
|-------|--------|
| listings_public view | zone NOT NULL OR (city + lat/lng NOT NULL) |
| Padova spike | Spike task gates padova/padova before seed constant |
| usato dedupe | Existing external_url dedupe |
| region column | Add text column at ingest (veneto) |
| admin warning | Banner at ≥30 URLs |
| city column type | Free text, not enum |
| category parser | Parse slug from listing detail URL path |

---

## Claude's Discretion

- Scrape concurrency: Standard preset, minConcurrency 1–2 for 34 URLs (minimize block risk)
- National location model: city + region text columns (user deferred to "best solution")

## Deferred Ideas

- Multi-worker parallel scraping per category
- National region picker UI
- Padova zone polygons
- Category filter localStorage persistence
- Map fit-all bounds for Padova
