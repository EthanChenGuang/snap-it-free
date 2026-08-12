# 7-Day Direct Production Spike (PROXY-C02)

**Spike start:** 2026-08-12T00:00:00Z  
**Spike end (planned):** 2026-08-19T23:59:59Z  
**Environment:** Fly.io scraper worker (`FLY_APP_NAME` — set when known)  
**Proxy posture:** Direct crawl — `proxy_enc` cleared / no proxy URL configured

## Objective

Measure Subito block rate on production Fly.io datacenter IPs without residential proxy for 7 days. Outcome feeds `16-DECISION-GATE.md` (STAY_DIRECT vs NEED_RESIDENTIAL).

## Operator checklist

Before starting the spike window:

- [ ] Clear proxy in Admin → Settings → Proxy card (remove URL), **or** set `proxy_enc` null via `scraper/scripts/configure-proxy.mjs` with empty value / admin DB update
- [ ] Confirm worker `evaluateProxyGate` marks runs `degraded=true` when proxy unset (expected)
- [ ] Verify incremental cron active (`scraper_sources.interval_minutes` ≈ 30, Fly cron enabled)
- [ ] Note Fly app name in **Environment** row below
- [ ] Record spike start date (ISO) — default **2026-08-12**

During the spike (daily or at end):

```bash
node --import tsx scraper/scripts/run-direct-production-spike.mjs
```

Monitor admin degraded banner and operator email when blocked ratio exceeds 50% (existing D-15-31).

## Environment

| Field | Value |
|-------|-------|
| Fly app | _(operator: fill from `fly apps list`)_ |
| Proxy cleared | ☐ confirmed |
| Incremental cadence | ~30 min |
| Spike start | 2026-08-12 |
| Spike end | _(7 days after start)_ |

## Daily metrics

Aggregate formula (canonical — matches `aggregate-block-rate.mjs`):

```
blocked_ratio_7d = sum(blocked_url_count) / sum(target_url_count)
target_url_count per run = COALESCE(array_length(target_urls_snapshot, 1), 0)
```

| Date | Runs | Mean blocked_ratio | Degraded runs | Notes |
|------|------|--------------------|---------------|-------|
| _pending_ | — | — | — | Day 0 baseline — run `run-direct-production-spike.mjs` |

### Aggregate summary (7-day window)

| Metric | Value |
|--------|-------|
| Window days | 7 |
| Total runs | _pending_ |
| blocked_ratio_7d | _pending_ |
| Gate recommendation | _pending_ |
| Sample sufficient (≥7 days)? | _pending_ |

## Daily log

_Appended automatically by `run-direct-production-spike.mjs`. Do not edit dated sections by hand._

<!-- daily-log-start -->

<!-- daily-log-end -->
