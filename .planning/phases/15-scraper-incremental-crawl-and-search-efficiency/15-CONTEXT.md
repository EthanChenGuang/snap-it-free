# Phase 15: Scraper Incremental Crawl & Search Efficiency — Context

**Gathered:** 2026-08-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 15 optimizes the **Subito worker crawl path** (not consumer search UI). Replace the current N+1 Playwright detail-page loop with a **fast category JSON extraction path**, add **DB-aware incremental stopping**, document **proxy posture for production**, and confirm the **crawler stack** via Wave 0 spike before ADR lock.

**In scope:**
- Wave 0 spike: Crawlee HttpCrawler vs Scrapling HTTP (+ TLS fingerprint test) on 3 live Subito URLs
- Primary extract path: 1 HTTP fetch per category page → parse `__NEXT_DATA__` / embedded JSON → normalize → persist
- Incremental: load known listing set once per run; early-stop per category URL; periodic full refresh
- Selective Playwright fallback: detail visit, pagination clicks, HTTP-block retry only
- Proxy strategy ADR + dedicated admin section; soft production gate
- Admin config: early_stop_k, full_refresh_hours, max_pages, manual full crawl
- Schema: scrape_runs crawl metrics + scraper_global_config JSON fields
- Validation gate: JSON field completeness replaces DOM selector rate
- Feature-flag rollout with shadow compare

**Out of scope:**
- Consumer feed search / FilterSheet (Phases 9–10)
- FB/Vinted/Wallapop crawlers
- Multi-worker parallel scraping (Phase 8 deferred)
- `?o=` query pagination (robots.txt); button pagination optional post-spike
- Apify/hosted actor implementation (rejected for Phase 15; noted as future escape hatch)
- Python/Scrapling full worker rewrite (unless spike overwhelmingly favors it — default stay Node/Crawlee)

</domain>

<decisions>
## Implementation Decisions

### Wave 0 Spike (stack lock gate)
- **D-15-01:** Run Wave 0 spike on **3 live URLs** (Venezia + Padova + one high-volume category) before locking stack ADR.
- **D-15-02:** Spike pass criteria: extract title, price, images, posted_at, external_id from JSON on all 3 URLs; ≤2s per URL HTTP; TLS fingerprint test (got-scraping) — proxy optional for spike. — **Reversibility:** costly — spike artifact and pass/fail gates Phase 15 plan waves.
- **D-15-03:** **Crawlee HttpCrawler wins by default** unless Scrapling HTTP wins on **both** block resistance and speed on all 3 URLs. Include TLS test in spike. Scrapling/Apify full migration rejected unless spike proves otherwise.
- **D-15-04:** Apify explicitly **rejected for Phase 15** implementation; mention as future escape hatch in stack ADR only.

### Incremental early-stop
- **D-15-05:** Early-stop **K=5** consecutive known-unchanged listings; scope is **per category URL**.
- **D-15-06:** "Known unchanged" = **external_id exists AND crawl-layer content_hash matches** (two-tier hash — see D-15-25).
- **D-15-07:** Load full known listing set (**external_id + crawl hash**) **once per run** via single DB query.
- **D-15-08:** Full refresh: **operator-configurable in admin** (default **24h**); disables early-stop for one run. Manual **"full crawl"** button in admin triggers same behavior.
- **D-15-09:** On full refresh: crawl all pages (within max_pages); hash-unchanged listings skip detail visit but **touch scraped_at/expires_at at persist**.
- **D-15-10:** Mid-page insert risk below K threshold is **acceptable** at 90min cadence; full refresh catches drift.

### Playwright fallback
- **D-15-11:** Coords: **municipality centroid from JSON first**; Playwright detail visit only if still null after centroid resolution (existing `extract.ts` pattern).
- **D-15-12:** Free-filter without description: trust **regalo category URL + JSON price field**; detail fallback if price ambiguous/missing; **title keyword scan** for paid signals (vendesi, €, prezzo).
- **D-15-13:** HTTP block (403, cookie wall, empty JSON): **one Playwright retry per URL**, then mark URL failed.
- **D-15-14:** Cookie wall: Playwright session accepts cookies; **export cookies to HTTP** for subsequent requests in same run where Crawlee supports it.
- **D-15-15:** Fallback queue: **concurrency 1**, separate Playwright queue; use existing anti-block preset for retries.
- **D-15-16:** Detail visit cap: **10% of listings per run** with overflow logged and deferred to next run (protects first-run / empty-DB cost).

### Production proxy
- **D-15-17:** Dev/local: proxy **optional**; log **warning** when unset (not startup failure).
- **D-15-18:** Production: **soft gate** — worker runs on full 34-URL matrix without proxy but marks run **degraded** + admin banner; not a hard startup block.
- **D-15-19:** Rotation: **single proxy URL** (current `proxy_enc`); rely on **provider-side rotation**; multi-URL `proxyUrls` array deferred unless spike shows IP-only blocks.
- **D-15-20:** ADR documents **Italian residential proxy required** for sustained production full matrix; **operator chooses provider** (Bright Data, Oxylabs, etc.).
- **D-15-21:** **Dedicated admin section** for proxy: configured/not, last block reason, degraded run count (extends beyond minimal banner).
- **D-15-22:** HttpCrawler uses **got-scraping** (TLS fingerprint); validated in Wave 0 spike.

### Pagination
- **D-15-23:** **Page 1 ships first**; button-click pagination added only if spike + early-stop coverage proves insufficient.
- **D-15-24:** If pagination ships: **max 3 pages per URL** (admin-tunable); early-stop **per page per URL**; pagination attempts **on full-refresh runs only** — incremental runs stay page 1.

### Validation, schema, rollout, alerts
- **D-15-25:** **Two-tier content_hash**: crawl hash (JSON fields: title, price, images, posted_at) drives early-stop; full hash at persist after enrichment (includes description, coords).
- **D-15-26:** Replace **selectorHitRate** validation gate with **JSON field completeness rate**; document threshold in ADR. Lower minimum listing count on **incremental runs**; full threshold on **full-refresh runs**.
- **D-15-27:** Schema migration (Wave 1): `scrape_runs` columns — `listings_skipped_at_crawl`, `http_requests`, `wall_time_seconds`, `crawl_mode` (incremental|full), `degraded`; extend `scraper_global_config` JSON for K, refresh hours, max pages.
- **D-15-28:** Rollout: **`USE_HTTP_CRAWLER` feature flag**; 3-run shadow compare (log diff HTTP vs legacy path) then **auto-cutover**.
- **D-15-29:** Performance target: **≥10× fewer HTTP requests** vs baseline (~1,050 → ≤120); wall time **≤8 min** for 34-URL matrix on happy path.
- **D-15-30:** Metrics: **scrape_runs columns + per-URL breakdown in structured logs** (crawl-skipped vs persist-skipped).
- **D-15-31:** Alerts: degraded flag on scrape_runs; **email operator only** on validation fail or **>50% URLs blocked** (no new Telegram in Phase 15).

### Admin config surface
- **D-15-32:** Admin scraper config page adds **4 fields**: `early_stop_k`, `full_refresh_hours`, `max_pages`, manual **full crawl** trigger; keep existing anti-block preset selector.

### Testing
- **D-15-33:** **Unit tests with captured `__NEXT_DATA__` fixtures** (no network); spike script for live validation; live URL integration test **manual / env-gated only** (not CI on every PR).

### Claude's Discretion
- Full refresh hash-unchanged behavior (touch expires_at without detail)
- Spike pass criteria fine-tuning (exact TLS test procedure)
- Crawlee vs Scrapling winner tie-break details
- Validation threshold numeric values (document in ADR during planning)
- Feature flag shadow compare logging format

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/ROADMAP.md` — Phase 15 goal, success criteria, execution order (before Phase 7 deploy)
- `.planning/REQUIREMENTS.md` — SCRP-E01 through SCRP-E08

### Scraper baseline
- `scraper/src/subito/crawler.ts` — current Playwright-only `runSubitoCrawler`
- `scraper/src/subito/extract.ts` — `__NEXT_DATA__` parse, centroid resolution, `RawListing` shape
- `scraper/src/subito/SPIKE-NOTES.md` — Phase 1 spike evidence (200 OK, 0 coords from JSON)
- `scraper/src/shared/persist.ts` — persist-layer `content_hash` dedup
- `scraper/src/shared/normalize.ts` — full `contentHash` computation
- `scraper/scripts/spike-subito-padova.mjs` — prior spike script pattern

### Proxy & legal
- `docs/legal/subito-scraping-note.md` — production residential proxy requirement (D-22 go-live ack)

### External research (spike comparison)
- Scrapling docs: https://scrapling.readthedocs.io/en/latest/index.html — HTTP/adaptive scraping framework evaluated in discussion; Python-only, spike benchmark only unless wins decisively

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `extract.ts`: already parses `__NEXT_DATA__`, resolves municipality centroids, defines `RawListing` and coord source tracking — primary HTTP path extends this, not replaces
- `persist.ts`: `content_hash` skip at persist layer — Phase 15 adds crawl-layer skip before HTTP cost
- `crawler.ts`: Crawlee `ProxyConfiguration`, session pool, anti-block presets — reuse for Playwright fallback queue
- `spike-subito-padova.mjs`: template for Wave 0 spike script structure

### Established Patterns
- Anti-block presets (conservative/standard/aggressive) in admin — fallback queue inherits preset concurrency/retries
- `scraper_global_config` singleton for proxy_enc — extend JSON blob for incremental settings
- `scrape_runs` batch validation gate — adapt metrics for HTTP path, not DOM selectors
- Regalo category URL validation via `isRegaloCategoryUrl` / `parseRegaloCategoryUrl`

### Integration Points
- Admin scraper config page (Phase 6) — add incremental fields + dedicated proxy health section
- Worker scheduler (`next_run_at` + 60s tick) — full refresh timer integrates with existing cron
- `scraper_sources.target_urls` (34 URLs) — incremental early-stop is per-URL within this matrix

</code_context>

<specifics>
## Specific Ideas

- User researched **Scrapling vs Playwright** comparison table — Scrapling strong on Python scraping ergonomics/adaptive selectors, but worker is TypeScript/Crawlee; spike gate before any Python migration
- **Apify** considered and rejected for Phase 15 — self-hosted worker preferred
- Acceptable tradeoff: new listings below K=5 stop point on page 2+ unseen until full refresh at 90min cadence
- Research draft D-15-01–D-15-08 validated and tightened through discussion (admin-configurable refresh, soft proxy gate, spike-first stack lock)

</specifics>

<deferred>
## Deferred Ideas

- **Apify hosted actor** — future escape hatch if self-hosted blocks persist post-deploy
- **Scrapling Python full rewrite** — only if Wave 0 spike shows Crawlee HTTP fails on all 3 URLs and Scrapling wins block+speed
- **Multi-URL proxy rotation UI** — defer unless spike shows IP-only blocks with provider-side rotation insufficient
- **Telegram operator alerts** — defer to Phase 7 (planned in INTEGRATIONS.md)
- **CI live URL tests on every PR** — rejected; env-gated manual only

</deferred>

---
*Phase: 15-scraper-incremental-crawl-and-search-efficiency*
*Context gathered: 2026-08-11*
