# ADR 015: Scraper HTTP Stack (Phase 15)

**Status:** Accepted  
**Date:** 2026-08-11  
**Requirements:** SCRP-E06  
**Spike artifact:** `.planning/phases/15-scraper-incremental-crawl-and-search-efficiency/15-SPIKE-HTTP-CATEGORY.md` (PASS 2026-08-11)

## Context

Phase 15 replaces the Subito worker's N+1 Playwright detail loop with an HTTP-first category JSON path. Wave 0 spike (D-15-01, D-15-02) proved that `__NEXT_DATA__` on category pages exposes title, price, images, posted_at, and external_id for Venezia arredamento-casalinghi, Padova, and a high-volume Veneto category — all within ≤2s per URL using got-scraping TLS.

## Decision

**Keep Crawlee + Node worker.** Primary engine: **HttpCrawler** (got-scraping transport). Secondary: **Playwright** only for cookie-wall/HTTP-block retry, capped detail enrichment, and optional future button pagination.

### Primary path (HttpCrawler)

- Fetch each category URL once via `HttpCrawler` with `got-scraping` TLS fingerprint (D-15-22).
- Parse listing array at `props.pageProps.initialState.items.originalList` (see spike field map).
- Map JSON fields per spike artifact; normalize to `RawListing` in `http-extract.ts` (Plan 15-03).
- Page 1 only for initial ship (D-15-23).

### Secondary path (Playwright)

Use Playwright **only** when:

- HTTP returns 403, cookie wall, or missing/empty `__NEXT_DATA__` (one retry per URL — D-15-13).
- Coords still null after municipality centroid from JSON (D-15-11).
- Price ambiguous or missing on regalo listing (D-15-12).
- Optional button pagination on full-refresh runs (D-15-24, deferred).

Fallback queue: concurrency **1**, separate from HTTP pool (D-15-15). Detail visit cap: **10%** of listings per run (D-15-16).

### Rejected for Phase 15

| Option | Disposition |
|--------|-------------|
| **Apify hosted actors** | Rejected for Phase 15 implementation (D-15-04). Listed as **future escape hatch** if self-hosted blocks persist post-deploy. |
| **Scrapling Python rewrite** | Spike-compared only; not run in Wave 0. Remains **future escape hatch** unless live re-spike shows Crawlee fails and Scrapling wins block resistance **and** speed on all 3 URLs (D-15-03). |
| **Playwright-only primary** | Superseded — HTTP JSON path proven by spike. |

## Validation gate change (D-15-26)

Replace DOM `selectorHitRate` with **JSON field completeness rate**:

| Threshold | Value | Applies when |
|-----------|-------|--------------|
| Field completeness | ≥ **0.9** | All runs |
| Minimum listing count ratio (full refresh) | ≥ **0.5** | `crawl_mode=full` |
| Minimum listing count ratio (incremental) | ≥ **0.2** | `crawl_mode=incremental` |

**Incremental escape:** When `listings_skipped_at_crawl > 0` and completeness ≥ 0.9, allow pass even if raw count ratio is below incremental min — early-stop intentionally reduces visible new listings.

Document threshold rationale in `validate-run.ts` when implementing Plan 15-05.

## Feature flag rollout (D-15-28)

Environment variable `USE_HTTP_CRAWLER`:

| Value | Behavior |
|-------|----------|
| `off` | Legacy Playwright-only category + detail loop |
| `shadow` | Run HttpCrawler; log structured compare metrics vs baseline; no cutover |
| `on` | HttpCrawler primary; Playwright fallback only |

**Cutover protocol:** Operator sets `USE_HTTP_CRAWLER=on` after **3 consecutive green shadow runs**. Shadow runs must log `AUTO_CUTOVER_READY` when completeness and block-rate gates pass. No silent auto-cutover without operator flip.

## Consequences

### Positive

- ~10× fewer HTTP requests on happy path (category fetch vs N+1 detail visits).
- Spike-locked field map de-risks Plans 15-03+.
- Existing Crawlee proxy/session infrastructure reused.

### Negative / risks

- Subito HTML/JSON drift requires re-spike and fixture refresh.
- Category JSON may omit coords — centroid + selective Playwright detail remains necessary.

## References

- Spike: `15-SPIKE-HTTP-CATEGORY.md` (PASS 2026-08-11)
- Fixture: `scraper/fixtures/subito-category-next-data-fragment.json`
- Prior DOM spike: `scraper/src/subito/SPIKE-NOTES.md`
- Legal: `docs/legal/subito-scraping-note.md`
