# Phase 16: Proxy Cost Verdict (PROXY-C01)

**Date:** 2026-08-12  
**Status:** Research artifact — formalizes `16-RESEARCH.md` for operator decision-making  
**Requirement:** PROXY-C01

## Executive summary

| Option | Truly free? | Production viable for Subito? | Recommendation |
|--------|-------------|-------------------------------|----------------|
| **No proxy (direct)** | ✅ Yes | ⚠️ Partial — Phase 15 spike PASS without proxy; incremental may work degraded | **Best zero-cost path** — already built (D-15-18, PROXY-C04 fallback) |
| **Open-source proxy managers** (Anakin, Trawl, Proxyhub) | ✅ Software free | ❌ No — they rotate proxies **you still pay for** | Not a cost fix by itself |
| **Free public proxy lists / Tor** | ✅ Yes | ❌ No — blocked, unreliable, security risk | Reject |
| **Self-hosted VPS (datacenter IP)** | ~€4–6/mo VPS | ⚠️ Maybe for incremental; risky for full matrix | Spike candidate only |
| **Webshare residential** | 1 GB/mo free tier | ✅ Test tier | **Cheapest paid** (~$1.40/GB) |
| **IPRoyal residential** | No | ✅ Yes | Budget paid ($1.75/GB, non-expiring traffic) |
| **Decodo (current)** | No | ✅ Yes | Mid-market ($2.00/GB) — current provider |

**Verdict:** There is **no sustainable free open-source residential IP network**. Open-source tools only manage proxies you supply. For snap-it-free, the realistic cost ladder is:

1. **Try direct crawl (free)** in incremental mode with existing degraded gate
2. **Webshare free tier** (1 GB/mo) for prod smoke / low volume
3. **Webshare paid** ($1.40/GB) or **IPRoyal** ($1.75/GB) if blocks require residential
4. Keep Decodo only if hard-target unblock rate justifies +43% cost vs Webshare

---

## Free / OSS verdict

### Proxy *infrastructure* (provides IPs) — nothing free for residential

Residential IPs come from real home/mobile devices. Someone pays for bandwidth. **No sustainable OSS project provides a free global residential pool.**

| Approach | Cost | Subito fit |
|----------|------|------------|
| Tor | Free | Blocked by Akamai / major CDNs |
| ScraperAPI free tier | 1000 req/mo | Too low for 34 URLs × daily |
| Webshare free tier | 10 proxies + **1 GB/mo** | Enough for incremental spike validation |
| Public proxy lists | Free | Unreliable, malware risk, 403 within minutes |

### Proxy *software* (manages rotation) — free but needs upstream IPs

These are **not** replacements for paid proxy — they optimize how you use proxies you already pay for:

| Project | License | What it does | Still need paid IPs? |
|---------|---------|--------------|----------------------|
| [Anakin](https://github.com/Anakin-Inc/anakin) | AGPL-3.0 | Thompson Sampling proxy pool, Camoufox browser | **Yes** |
| [Trawl](https://github.com/walle1798/trawl) | OSS | CF bypass, tier-4 residential escalation | **Yes** (Tier 4) |
| Proxyhub | OSS | Health-check + rotate proxy list | **Yes** |

**Conclusion:** Replacing Decodo with Anakin/Trawl/Proxyhub alone **does not reduce cost** unless we also remove the residential requirement.

### Already in codebase — zero-cost direct crawl

Phase 15 Wave 0 spike **passed all 3 Subito category URLs without proxy** (200 OK, ~250–1100 ms each). See `15-SPIKE-HTTP-CATEGORY.md`.

ADR 015 D-15-18: production **may run without proxy**, marks `degraded=true`, shows admin banner.

With Phase 15 incremental crawl:

- **~34 HTTP requests** per incremental run (1 page × 34 URLs)
- Early-stop reduces effective load when listings unchanged
- Traffic ≈ **few MB per run**, not GB — residential proxy may be **overkill** for incremental cadence

**Estimated incremental traffic:** 34 pages × ~500 KB HTML ≈ **17 MB/run**. At 48 runs/day (30 min interval) ≈ **800 MB/day** worst case — but early-stop + unchanged listings mean far fewer bytes in practice.

---

## Paid comparison

Sources: ProxyPeers, TrustMyIP, provider sites (May–Aug 2026). Prices change — verify at purchase.

| Provider | Residential $/GB | Pool | Italy geo | Free tier | Notes |
|----------|------------------|------|-----------|-----------|-------|
| **Webshare** | **$1.40** | 80M+ | Yes | **1 GB/mo, no CC** | Cheapest; clean API; no unlocker |
| **IPRoyal** | **$1.75** | Global | Yes | No | Non-expiring traffic packs |
| **Decodo** (current) | **$2.00** | 115M+ | Yes | Trial only | Tested on hard targets; ADR example |
| **Oxylabs** | $2.50–6 (volume) | 175M+ | Yes | No | Enterprise; scraper APIs |
| **Bright Data** | $4–8 promo | 400M+ | Yes | No | Largest pool; most expensive |

**Monthly cost example** (10 GB/mo residential):

| Provider | Cost |
|----------|------|
| Webshare | ~$14 |
| IPRoyal | ~$17.50 |
| Decodo | ~$20 |
| Bright Data | ~$40–80 |

For snap-it-free incremental workload, **10 GB/mo is likely an upper bound**; real usage may be 1–3 GB/mo.

---

## Decision tree

**50% block-rate gate:** `blocked_ratio_7d = sum(blocked_url_count) / sum(target_url_count)` across Subito `scrape_runs` in a 7-day window. See `aggregate-block-rate.mjs` and `16-DECISION-GATE.md` (Plan 16-03).

```
Start
  │
  ├─► Run incremental WITHOUT proxy (degraded mode)
  │     ├─ blocked_ratio_7d < 0.5 for 7 days → STAY_DIRECT ✅
  │     └─ blocked_ratio_7d ≥ 0.5 → step down
  │
  ├─► Webshare free tier (1 GB/mo) — validate prod from Fly.io IP
  │
  ├─► Webshare paid $1.40/GB — lowest cost residential
  │
  ├─► IPRoyal $1.75/GB — non-expiring traffic alternative
  │
  └─► Decodo $2.00/GB — only if Webshare block rate unacceptable
```

### Cost ladder tiers (operator order)

| Tier | Cost | When |
|------|------|------|
| 1. Direct (no proxy) | **Free** | Default when 7-day block rate < 50% |
| 2. Webshare free | **Free** (1 GB/mo) | Prod smoke / validation after gate fails |
| 3. Webshare paid | **$1.40/GB** | Lowest paid residential |
| 4. IPRoyal | **$1.75/GB** | Alternative paid tier |
| 5. Decodo | **$2.00/GB** | Current provider; keep if cheaper tiers fail unblock |

---

## Answer to "must use free open source"

**Strict interpretation (free residential IPs):** Not available. Cannot comply without accepting direct/degraded crawl.

**Pragmatic interpretation (free OSS stack):**

- Keep **Crawlee + existing worker** (already OSS)
- Use **direct crawl** (free) as primary when block rate acceptable
- Optional: deploy **Anakin/Trawl** only if CF bypass layer needed — still doesn't eliminate proxy cost

**If operator insists on zero recurring cost:** Remove `PROXY_URL` / clear `proxy_enc`, run degraded, monitor block metrics via `aggregate-block-rate.mjs`, accept occasional empty feeds or manual runs.

---

## References

- Research source: `16-RESEARCH.md`
- ADR 015: `docs/adr/015-production-proxy.md` (Cost ladder draft in Plan 16-02)
- Phase 15 spike: `15-SPIKE-HTTP-CATEGORY.md` (no proxy PASS)
- PROXY-C04 fallback: `scraper/src/worker-proxy-fallback.ts`
- Spike matrix script: `scraper/scripts/spike-subito-proxy-matrix.mjs`
- Block-rate aggregation: `scraper/scripts/aggregate-block-rate.mjs`
- ProxyPeers cheapest guide (May 2026)
- Anakin proxy pool docs: Thompson Sampling over user-supplied URLs

---
*Generated for Phase 16 Plan 02 (PROXY-C01)*
