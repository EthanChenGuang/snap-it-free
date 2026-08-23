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

## Cost ladder (Phase 16)

**Status:** Accepted addendum (Phase 16 Plan 05 — PROXY-C05)  
**Measurement:** 7-day production spike — `16-DECISION-GATE.md` (STAY_DIRECT at 2.5% blocked_ratio_7d, operator approved 2026-08-12)

Phase 16 research (PROXY-C01) finds **no free residential IP pool**. OSS proxy managers (Anakin, Trawl, Proxyhub) only rotate **paid upstream IPs**. The operator cost ladder:

| Tier | Admin label | Provider / mode | Cost | When to use |
|------|-------------|-----------------|------|-------------|
| 1 | **直连免费** (direct_free) | Direct (no proxy) | Free | 7-day `blocked_ratio_7d` **< 0.5** (50% gate) |
| 2 | **Webshare 经济档** (webshare_budget) | Webshare free → paid | Free 1 GB/mo → ~$1.40/GB | 0.5 ≤ ratio **< 0.7** — budget residential |
| 3 | **住宅代理推荐** (residential_recommended) | Webshare / IPRoyal / Decodo | $1.40–2.00/GB | ratio **≥ 0.7** — sustained blocks |

Admin Settings proxy card surfaces the computed tier from `getSubitoBlockedRatio7d()` (rolling 7-day window, ≥3 runs required).

### Residential requirement demotion

- **Before (Phase 15):** Italian residential proxy **required** for sustained production full 34-URL matrix (D-15-20).
- **After (Phase 16):** Residential proxy **optional by default**; **recommended when** 7-day `blocked_ratio_7d ≥ 0.5`:

  `blocked_ratio_7d = sum(blocked_url_count) / sum(target_url_count)` across Subito `scrape_runs` in the window.

  `target_url_count` per run = `COALESCE(array_length(target_urls_snapshot, 1), 0)`.

- Direct/degraded crawl remains valid at tier 1; PROXY-C04 adds single direct retry on quota exhaustion.
- **Current production posture (2026-08-12):** STAY_DIRECT — tier 1 active; proxy unset acceptable.

### Admin cost tier thresholds (PROXY-C05)

| blocked_ratio_7d | Tier | Action |
|------------------|------|--------|
| null (< 3 runs) | insufficient_data | Monitor; no spend change |
| < 0.5 | direct_free | Keep proxy unset |
| 0.5 – 0.7 | webshare_budget | Trial Webshare free tier |
| ≥ 0.7 | residential_recommended | Configure Italian residential proxy |

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
