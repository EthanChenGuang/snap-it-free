# Phase 15 — API Coverage Decision Checkpoint

**Phase:** 15-scraper-incremental-crawl-and-search-efficiency  
**Checked:** 2026-08-11  
**External surface:** Crawlee `HttpCrawler` / transitive `got-scraping` against Subito.it category HTML (existing scrape surface, new primary transport)

## Verdict

**INTEGRATE** existing Crawlee HTTP APIs already present via installed `crawlee@3.17` (no new production registry packages required). Scrapling is spike-only OPT-OUT for production worker.

## Coverage Matrix

| API / SDK surface | Disposition | Reason |
|-------------------|-------------|--------|
| Crawlee `HttpCrawler` | INTEGRATE | Locked primary engine (D-15-03, D-15-22, SCRP-E06); already in worker deps |
| Crawlee `ProxyConfiguration` / session pool | INTEGRATE | Reuse existing crawler proxy wiring |
| Crawlee `PlaywrightCrawler` | INTEGRATE (fallback only) | SCRP-E04 / D-15-11–16 — secondary path |
| got-scraping TLS fingerprint (via HttpCrawler) | INTEGRATE | D-15-22; transitive dep — optional direct pin only if spike scripts need clearer imports |
| Scrapling (Python) | OPT-OUT (production) | Spike comparison only (D-15-03); full rewrite deferred unless spike wins both block+speed on all 3 URLs |
| Apify Actors hosted API | OPT-OUT | Explicitly rejected for Phase 15 (D-15-04); ADR escape hatch only |
| Subito public category pages (HTTPS) | INTEGRATE | Existing scrape target; Wave 0 proves `__NEXT_DATA__` field map |

## Notes

- No new Stripe/OAuth/third-party REST product APIs in this phase.
- Admin Next routes (`/api/admin/config`, `/api/admin/jobs`) are first-party extensions, not external API integrations.
- Live Subito calls stay env-gated / spike-only (D-15-33) — CI uses fixtures.
