# Phase 15: Scraper Incremental Crawl & Search Efficiency — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-11
**Phase:** 15-scraper-incremental-crawl-and-search-efficiency
**Areas discussed:** Incremental early-stop, Playwright fallback, Production proxy gate, Pagination depth, Stack spike gate (Crawlee vs Scrapling), Wave 0 spike criteria, Validation gate, Admin config, Apify evaluation, Free-filter HTTP path, DB schema, Rollout strategy, Operator alerts, Performance targets, content_hash strategy, Testing strategy

---

## Incremental early-stop

| Option | Description | Selected |
|--------|-------------|----------|
| K=3 | Aggressive stop | |
| K=5 | Balanced default | ✓ |
| K=10 | Conservative | |
| You decide | Tunable constant | |

**User's choice:** K=5
**Notes:** Per category URL scope; external_id + content_hash match for skip; known set loaded once per run; full refresh admin-configurable (default 24h) + manual full crawl button; mid-page insert risk acceptable at 90min cadence.

---

## Playwright fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Always detail for null coords | | |
| Centroid first | Existing extract.ts pattern | ✓ (via Claude discretion) |
| Reject no coords | | |
| You decide | | ✓ |

**User's choice:** Claude discretion — centroid first, detail if null; trust JSON price on regalo URLs; one Playwright retry on block; concurrency 1; 10% detail cap per run; cookie export to HTTP where possible.

---

## Production proxy gate

| Option | Description | Selected |
|--------|-------------|----------|
| Optional dev | | ✓ (Claude: + warn when unset) |
| Banner only | | |
| Hard gate | | |
| Soft gate | Banner + degraded flag | ✓ (Claude discretion) |

**User's choice:** Dev optional with warning; prod soft gate; single URL provider-side rotation; Italian residential in ADR; dedicated admin proxy section; TLS test in spike.

---

## Pagination depth

| Option | Description | Selected |
|--------|-------------|----------|
| Page 1 only MVP | | |
| Button pagination Phase 15 | | |
| Spike decides | | ✓ (Claude discretion) |

**User's choice:** Page 1 ships; pagination on full-refresh runs only if needed; max 3 pages admin-tunable; early-stop per page per URL.

---

## Stack choice (Crawlee vs Scrapling vs Apify)

| Option | Description | Selected |
|--------|-------------|----------|
| Crawlee hybrid | Engine swap on existing TS worker | Default |
| Scrapling rewrite | Python migration | |
| Apify hosted | | Rejected |
| Spike first | Wave 0 compare before ADR lock | ✓ |

**User's choice:** Wave 0 spike gate. User provided Scrapling vs Playwright research table. Crawlee default unless Scrapling wins block+speed on all 3 spike URLs. Apify rejected for Phase 15.

---

## Wave 0 spike criteria

| Option | Description | Selected |
|--------|-------------|----------|
| 1 URL Venezia | | |
| 3 URLs | Venezia + Padova + high-volume | ✓ |
| 5 URL sample | | |
| Pass: fields + perf + TLS | | ✓ (Claude discretion) |

---

## Validation gate (SCRP-E08)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep selector thresholds | | |
| JSON field completeness | Replace selectorHitRate | ✓ (Claude discretion) |
| Lower threshold incremental | | ✓ (Claude discretion) |

---

## Admin config, schema, rollout, alerts

**User's choice:** Mostly Claude discretion — core 4 admin fields; scrape_runs + config JSON migration; USE_HTTP_CRAWLER flag with 3-run shadow compare; email alert on validation fail or >50% URL block only.

---

## Performance, hash, testing

**User's choice:** Claude discretion — ≥10× requests, ≤8 min wall time; two-tier content_hash; fixture unit tests + env-gated live test.

---

## Claude's Discretion

Full refresh touch behavior, spike pass fine-tuning, validation numeric thresholds, shadow compare log format, free-filter keyword list specifics.

---

## Deferred Ideas

- Apify hosted actor (future escape hatch)
- Scrapling full Python rewrite (only if spike decisive)
- Multi-URL proxy rotation UI
- Telegram alerts (Phase 7)
- CI live URL tests every PR
