# Phase 18: Facebook Marketplace Scraping — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `18-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-08-15
**Phase:** 18-facebook-marketplace-scraping
**Areas discussed:** Free-item detection, Auth & crawl stack, URL matrix & geography, Category mapping

---

## Free-item detection

| Option | Description | Selected |
|--------|-------------|----------|
| Price field only | Accept only structured free price in price field | ✓ |
| Search URL + price confirm | Discovery via query URLs; extract confirms price | |
| Keyword in title + free price | Both keyword and price required | |
| Trust search URL match | Accept from gratis/regalo/free search without price check | |

**User's choice:** Price field only (all 4 questions chose recommended option 1)
**Notes:** Structured zero only; reject ambiguous price at extract; require local pickup (Vinted parity).

---

## Auth & crawl stack

| Option | Description | Selected |
|--------|-------------|----------|
| Logged-in session required | Wave 0 must prove auth session | ✓ |
| Operator-managed cookies | Admin upload + test; no auto login | ✓ |
| Playwright-first | Browser primary crawl engine | ✓ |
| Residential proxy day one | Not direct/degraded default for FB | ✓ |

**User's choice:** Full recommended stack across 16 questions (4 rounds × 4 + extras)
**Notes:** session_enc on scraper_sources; pre-flight probe; concurrency 1; incremental after Wave 0; detail fallback capped; Wave 0 fail = hard stop; conservative preset; page 1 only.

---

## URL matrix & geography

| Option | Description | Selected |
|--------|-------------|----------|
| Venice + Padova parity | 6 URLs = 2 cities × 3 queries | ✓ |
| Search-query matrix | Not 17-slug × city matrix | ✓ |
| Full admin UI parity | Subito source detail + session field | ✓ |
| Mixed feed + chip + search | Consumer integration mirrors Vinted | ✓ |

**User's choice:** Recommended options throughout (7 rounds of follow-ups)
**Notes:** User typed "12" once — interpreted as "1" (48h expiry). Wave 0 Venice-only; migration ships 6 URLs. Dedup by external_id. enabled=false when live.

---

## Category mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid map + inference | Replace D-09 stub | ✓ |
| Unmapped → null | Phase 12 D-08 semantics | ✓ |
| No FilterSheet changes | Phase 12.1 i18n labels | ✓ |
| Best-effort Wave 0 map | Not blocking on all 17 slugs | ✓ |

**User's choice:** Recommended options across 4 rounds
**Notes:** Persist slug at scrape; re-resolve on hash change; detail fallback for category; update D-09 tests; map in canonical-categories.ts.

---

## Claude's Discretion

- Wave 0 JSON field names and cookie format
- Detail visit cap exact number (~10% default)
- Source chip label within Stitch tokens
- Padova FB city slug strings in migration seeds
- Post-Wave 0 map expansion

## Deferred Ideas

- Consumer source filter in FilterSheet
- Favorites category folders
- FB category-specific URLs (post-launch if supported)
- Pagination beyond page 1
- Automated Facebook login
