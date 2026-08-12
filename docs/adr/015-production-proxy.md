# ADR 015: Production Proxy Posture (Phase 15)

**Status:** Accepted  
**Date:** 2026-08-11  
**Requirements:** SCRP-E05  
**Related:** `docs/legal/subito-scraping-note.md` (D-22 go-live acknowledgment)

## Context

Subito.it disallows automated access in `robots.txt`. Sustained scraping of the full 34-URL Venice+Padova matrix from a single datacenter IP risks blocks. Phase 15 documents operator-facing proxy requirements while keeping dev/local iteration frictionless.

Wave 0 spike (2026-08-11) ran **without proxy** and PASSed — acceptable for dev validation only (D-15-17).

## Decision

### Development / local

- Proxy is **optional**.
- When `proxy_enc` / `SCRAPER_PROXY_URL` is unset, worker logs a **warning** at startup — not a hard failure (D-15-17).
- Direct fetch is acceptable for spike scripts and low-volume local runs.

### Production

- **Italian residential proxy required** for sustained production full 34-URL matrix (D-15-20).
- Operator chooses provider (Bright Data, Oxylabs, Webshare, Decodo, etc.) — no vendor lock-in in code.
- **Soft degraded gate** (D-15-18): worker **may run** without proxy but must:
  - Set `scrape_runs.degraded = true`
  - Surface admin banner / dedicated proxy health section (D-15-21)
  - **Not** hard-block startup or refuse to enqueue jobs

This is intentional: empty feeds are worse than degraded runs with visible operator signal.

### Rotation model (D-15-19)

- **Single proxy URL** stored in `scraper_global_config.proxy_enc` (existing encrypted field).
- Rely on **provider-side rotation** (residential pool, sticky session, or gateway rotation).
- Multi-URL `proxyUrls[]` UI deferred unless spike/production shows IP-only blocks with single-URL rotation insufficient.

### Credential handling

- Never log decrypted proxy credentials (T-15-01).
- Mask proxy URL in spike artifacts and structured logs (host only, no user:pass).
- Worker decrypts at runtime only inside scraper process.

## Operational checklist

Before production cadence:

- [ ] Residential proxy configured with Italian geo targeting
- [ ] Go-live acknowledgment signed in `docs/legal/subito-scraping-note.md`
- [ ] Admin proxy health section shows configured + last block reason
- [ ] Degraded runs monitored; email alert on >50% URL blocks (D-15-31)

## Consequences

### Positive

- Clear dev vs prod posture without blocking local development.
- Operators see degraded state instead of silent block-induced empty feeds.

### Negative

- Production without proxy remains possible (soft gate) — operator discipline required.
- Provider selection and cost are out-of-repo concerns.

## Cost ladder (Phase 16 draft)

**Status:** Draft — finalized in Phase 16 Plan 05 (PROXY-C05) after 7-day production measurement.

Phase 16 research (PROXY-C01) finds **no free residential IP pool**. OSS proxy managers (Anakin, Trawl, Proxyhub) only rotate **paid upstream IPs**. The operator cost ladder:

| Tier | Provider / mode | Cost | When to use |
|------|-----------------|------|-------------|
| 1 | **Direct (no proxy)** | Free | Default when 7-day `blocked_ratio_7d` **< 0.5** (50% gate) |
| 2 | **Webshare free tier** | Free (1 GB/mo) | Prod validation after gate fails; smoke tests |
| 3 | **Webshare paid** | ~$1.40/GB | Lowest-cost residential when direct blocked |
| 4 | **IPRoyal** | ~$1.75/GB | Budget alternative; non-expiring traffic packs |
| 5 | **Decodo** (current) | ~$2.00/GB | Keep only if cheaper tiers fail unblock targets |

### Residential requirement demotion

- **Before (Phase 15):** Italian residential proxy **required** for sustained production full 34-URL matrix (D-15-20).
- **After (Phase 16 draft):** Residential proxy **recommended when** 7-day `blocked_ratio_7d ≥ 0.5`, where:

  `blocked_ratio_7d = sum(blocked_url_count) / sum(target_url_count)` across Subito `scrape_runs` in the window.

  `target_url_count` per run = `COALESCE(array_length(target_urls_snapshot, 1), 0)`.

- Direct/degraded crawl remains valid at tier 1; PROXY-C04 adds single direct retry on quota exhaustion.

### Traffic estimate (incremental)

~34 category URLs × ~500 KB HTML ≈ **17 MB/run** (upper bound before early-stop). Real usage likely 1–3 GB/mo residential if proxy required.

### Measurement tooling

- `scraper/scripts/spike-subito-proxy-matrix.mjs` — same URL matrix with `--direct` or `--proxy-url`
- `scraper/scripts/aggregate-block-rate.mjs` — 7-day block-rate for decision gate
- Verdict artifact: `.planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-PROXY-COST-VERDICT.md`

## References

- Spike proxy note: `15-SPIKE-HTTP-CATEGORY.md` § Proxy
- Stack ADR: `docs/adr/015-scraper-http-stack.md`
- Legal: `docs/legal/subito-scraping-note.md`
- Phase 16 verdict: `.planning/phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-PROXY-COST-VERDICT.md`
