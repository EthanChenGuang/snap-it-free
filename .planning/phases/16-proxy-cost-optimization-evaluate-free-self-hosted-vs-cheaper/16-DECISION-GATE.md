# Direct Crawl Decision Gate (PROXY-C02)

**Requirement:** PROXY-C02 — 7-day production direct-crawl block-rate measurement  
**Related:** ADR 015 Cost ladder, `16-PROXY-COST-VERDICT.md`, `aggregate-block-rate.mjs`

## Gate formula

Across Subito `scrape_runs` in the spike window (default 7 days):

```
blocked_ratio_7d = sum(blocked_url_count) / sum(target_url_count)
```

Per run:

```
target_url_count = COALESCE(array_length(target_urls_snapshot, 1), 0)
```

Same canonical formula as `aggregate-block-rate.mjs` and future `getSubitoBlockedRatio7d` (Plan 16-05).

## Threshold

| Condition | Verdict | Recommendation |
|-----------|---------|----------------|
| `blocked_ratio_7d < 0.5` (50%) | **PASS** | **STAY_DIRECT** — continue zero-cost direct incremental crawl |
| `blocked_ratio_7d ≥ 0.5` (50%) | **FAIL** | **NEED_RESIDENTIAL** — proceed to Plan 16-04 provider comparison (Webshare free → paid ladder) |
| Fewer than 7 calendar days of spike data | **INSUFFICIENT_DATA** | Do **not** auto-PASS; extend spike or document early verdict with operator rationale |

## Insufficient sample rule (T-16-06)

- Gate verdict requires either **≥7 days** in the spike window **or** explicit operator sign-off with documented rationale.
- `<7 days` data: run `node --import tsx scraper/scripts/aggregate-block-rate.mjs --days N` for partial visibility only; mark artifact `INSUFFICIENT_DATA` until window completes.
- Never infer PASS from a single good day.

## Current verdict

| Field | Value |
|-------|-------|
| Last computed | _pending_ |
| Window | 7 days (from spike start 2026-08-12) |
| blocked_ratio_7d | _pending_ |
| Gate | _pending_ |
| Recommendation | _pending_ |

## Operator actions after verdict

### PASS → STAY_DIRECT

1. Record verdict in `16-SPIKE-DIRECT-7DAY.md` aggregate summary.
2. Keep proxy unset; monitor degraded runs periodically.
3. Skip Plan 16-04 provider comparison unless block rate rises later.
4. Finalize ADR cost ladder in Plan 16-05 with direct as tier-1.

### FAIL → NEED_RESIDENTIAL

1. Record verdict and blocked ratio in spike artifact.
2. Execute Plan 16-04: Webshare free tier spike vs direct matrix.
3. Configure cheapest acceptable residential provider per cost ladder.
4. Re-enable proxy via Admin Settings or `configure-proxy.mjs`.

## Compute commands

```bash
# One-shot summary (stdout JSON + markdown snippet)
node --import tsx scraper/scripts/aggregate-block-rate.mjs --days 7

# Append dated entry to spike artifact
node --import tsx scraper/scripts/run-direct-production-spike.mjs
```
