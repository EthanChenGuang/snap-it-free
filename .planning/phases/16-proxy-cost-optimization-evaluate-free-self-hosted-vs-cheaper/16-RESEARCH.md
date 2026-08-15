# Phase 16 Research: Proxy Cost Optimization

**Date:** 2026-08-12  
**Trigger:** Decodo residential proxy quota exhausted; operator cost concern.

## Executive summary

| Option | Truly free? | Production viable for Subito? | Recommendation |
|--------|-------------|-------------------------------|----------------|
| **No proxy (direct)** | ✅ Yes | ⚠️ Partial — spike PASS without proxy; incremental may work degraded | **Best zero-cost path** — already built (D-15-18) |
| **Open-source proxy managers** (Anakin, Trawl, Proxyhub) | ✅ Software free | ❌ No — they rotate proxies **you still pay for** | Not a cost fix by itself |
| **Free public proxy lists / Tor** | ✅ Yes | ❌ No — blocked, unreliable, security risk | Reject |
| **Self-hosted VPS (datacenter IP)** | ~€4–6/mo VPS | ⚠️ Maybe for incremental; risky for full matrix | Spike candidate |
| **Webshare residential** | 1 GB/mo free tier | ✅ Test tier | **Cheapest paid** (~$1.40/GB) |
| **IPRoyal residential** | No | ✅ Yes | Budget paid ($1.75/GB, non-expiring traffic) |
| **Decodo (current)** | No | ✅ Yes | Mid-market ($2.00/GB) — what we use today |

**Verdict:** There is **no free open-source residential IP network**. Open-source tools only manage proxies you supply. For snap-it-free, the realistic cost ladder is:

1. **Try direct crawl (free)** in incremental mode with existing degraded gate
2. **Webshare free tier** (1 GB/mo) for prod smoke / low volume
3. **Webshare paid** ($1.40/GB) or **IPRoyal** ($1.75/GB) if blocks require residential
4. Keep Decodo only if hard-target unblock rate justifies +43% cost vs Webshare

---

## 1. Free / open-source — what exists?

### A. Proxy *infrastructure* (provides IPs) — nothing free for residential

Residential IPs come from real home/mobile devices. Someone pays for bandwidth. No sustainable OSS project provides a free global residential pool.

| Approach | Cost | Subito fit |
|----------|------|------------|
| Tor | Free | Blocked by Akamai / major CDNs |
| ScraperAPI free tier | 1000 req/mo | Too low for 34 URLs × daily |
| Webshare free tier | 10 proxies + **1 GB/mo** | Enough for incremental spike validation |
| Public proxy lists | Free | Unreliable, malware risk, 403 within minutes |

### B. Proxy *software* (manages rotation) — free but needs upstream IPs

These are **not** replacements for paid proxy — they optimize how you use proxies you already pay for:

| Project | License | What it does | Still need paid IPs? |
|---------|---------|--------------|----------------------|
| [Anakin](https://github.com/Anakin-Inc/anakin) | AGPL-3.0 | Thompson Sampling proxy pool, Camoufox browser | **Yes** |
| [Trawl](https://github.com/walle1798/trawl) | OSS | CF bypass, tier-4 residential escalation | **Yes** (Tier 4) |
| Proxyhub | OSS | Health-check + rotate proxy list | **Yes** |

**Conclusion:** Replacing Decodo with Anakin alone **does not reduce cost** unless we also remove residential requirement.

### C. Already in codebase — zero-cost direct crawl

Phase 15 Wave 0 spike **passed all 3 Subito category URLs without proxy** (200 OK, ~250–1100 ms each).

ADR 015 D-15-18: production **may run without proxy**, marks `degraded=true`, shows admin banner.

With Phase 15 incremental crawl:
- **~34 HTTP requests** per incremental run (1 page × 34 URLs)
- Early-stop reduces effective load when listings unchanged
- Traffic ≈ **few MB per run**, not GB — residential proxy may be **overkill** for incremental cadence

**Estimated incremental traffic:** 34 pages × ~500 KB HTML ≈ **17 MB/run**. At 48 runs/day (30 min interval) ≈ **800 MB/day** worst case — but early-stop + unchanged listings mean far fewer bytes in practice.

---

## 2. Paid provider comparison (residential, 2026)

Sources: ProxyPeers, TrustMyIP, provider sites (May–Aug 2026). Prices change — verify at purchase.

| Provider | Residential $/GB | Pool | Italy geo | Free tier | Notes |
|----------|------------------|------|-----------|-----------|-------|
| **Webshare** | **$1.40** | 80M+ | Yes | **1 GB/mo, no CC** | Cheapest; clean API; no unlocker |
| **IPRoyal** | **$1.75** | Global | Yes | No | Non-expiring traffic packs |
| **Decodo** (current) | **$2.00** | 115M+ | Yes | Trial only | Tested on hard targets; our ADR example |
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

## 3. Recommended strategy (decision tree)

```
Start
  │
  ├─► Run incremental WITHOUT proxy (degraded mode)
  │     ├─ blocked_url_count < 50% for 7 days → STAY FREE ✅
  │     └─ blocks increase → step down
  │
  ├─► Webshare free tier (1 GB/mo) — validate prod from Fly.io IP
  │
  ├─► Webshare paid $1.40/GB — lowest cost residential
  │
  └─► Decodo $2.00/GB — only if Webshare block rate unacceptable
```

### Implementation items for Phase 16

1. **Spike:** 7-day incremental runs without proxy on Fly.io; track `blocked_url_count`, `degraded`
2. **Spike:** Webshare free tier from production worker; compare block rate vs direct
3. **Worker:** Proxy quota fatal → fallback to direct + degraded (from prior conversation)
4. **Admin:** Surface monthly traffic estimate + provider cost hint in settings
5. **ADR update:** Document cost ladder; demote "residential required" to "recommended when direct block rate > X%"

---

## 4. Answer to "must use free open source"

**Strict interpretation (free residential IPs):** Not available. Cannot comply without accepting direct/degraded crawl.

**Pragmatic interpretation (free OSS stack):**
- Keep **Crawlee + existing worker** (already OSS)
- Use **direct crawl** (free) as primary when block rate acceptable
- Optional: deploy **Anakin/Trawl** only if we need CF bypass layer — still doesn't eliminate proxy cost

**If user insists on zero recurring cost:** Remove `PROXY_URL` / clear `proxy_enc`, run degraded, monitor block metrics, accept occasional empty feeds or manual runs.

---

## References

- ADR 015: `docs/adr/015-production-proxy.md`
- Phase 15 spike: `15-SPIKE-HTTP-CATEGORY.md` (no proxy PASS)
- ProxyPeers cheapest guide (May 2026)
- Anakin proxy pool docs: Thompson Sampling over user-supplied URLs
