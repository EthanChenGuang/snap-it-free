# Subito.it Scraping — Legal & Operational Note

**Document ID:** D-22  
**Last verified:** 2026-07-26  
**Project:** 零元 (ZeroDollar / ZeroEuro) — Venice Free Finds MVP

## Purpose

This note records the deliberate decision to use Subito.it as the primary scraped supply source for Phase 1, despite Subito's explicit prohibition of automated access in `robots.txt`. It exists so future operators understand the risk, the fallback plan, and the go-live acknowledgment required before production traffic.

## robots.txt Status

Subito.it's `robots.txt` (verified 2026-07-26) explicitly disallows automated crawling of listing pages. Relevant directives include disallow rules for listing and search paths. This is not a soft crawl-delay policy — it is an explicit prohibition.

**Operational implication:** Sustained scraping may result in IP blocks, CAPTCHAs, HTTP 403/429 responses, or direct contact from Subito. The scraper treats these as product risks, not surprises.

## Operational Risk Summary

| Risk | Mitigation in Phase 1 |
|------|----------------------|
| IP / session blocks | Crawlee session pool + residential proxy rotation (D-04) |
| Soft blocks (200 with empty feed) | Batch validation gate — no DB writes on failed runs (D-19, D-20) |
| Selector drift | Fetch/extract separation; spike before locking selectors (D-23) |
| Legal / ToS enforcement | This document + fallback supply plan below |

## Fallback Supply Plan

If Subito scraping becomes untenable (sustained blocks, legal notice, or unreliable feed quality):

1. **Manual seeding** — Operator curates initial listings directly into Supabase via SQL or a minimal admin script.
2. **Accelerated UGC (Phase 3 pull-forward)** — Prioritize user-posted free items to restore supply density on the map.
3. **Pause scraper worker** — Stop cron; retain audit tables (`scrape_runs`, `scrape_rejects`) for post-mortem.

The product must remain usable with UGC-only supply; the map UI (Phase 2) reads the same `listings` table regardless of `source`.

## Security & Secrets

- `SUPABASE_SERVICE_ROLE_KEY` is **worker-only** — never commit, never expose in client bundles.
- Store credentials in `.env` (gitignored). See `.env.example` at repo root.
- Scraper package lives in `scraper/` — isolated from future Next.js frontend.

## Go-Live Acknowledgment

Before pointing the scraper at production Subito traffic, the operator must confirm:

- [ ] I have read this note and understand Subito's `robots.txt` prohibits automated access.
- [ ] I accept operational risk of blocks and potential legal contact.
- [ ] I have reviewed the fallback supply plan and can execute manual seeding or UGC acceleration if needed.
- [ ] `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured in worker env only.
- [ ] Residential proxy credentials are configured (required for sustained production cadence).

**Operator signature / date:** ___________________________

---

*Related decisions: D-06 (Supabase store), D-07 (service-role writes), D-19/D-20 (batch validation), D-22 (this note)*
