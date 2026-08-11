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

## References

- Spike proxy note: `15-SPIKE-HTTP-CATEGORY.md` § Proxy
- Stack ADR: `docs/adr/015-scraper-http-stack.md`
- Legal: `docs/legal/subito-scraping-note.md`
