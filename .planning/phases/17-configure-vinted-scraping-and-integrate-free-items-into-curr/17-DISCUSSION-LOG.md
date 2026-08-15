# Phase 17: Vinted Scraping & Subito Category Integration — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-15
**Phase:** 17-vinted-scraping-subito-category-integration
**Areas discussed:** free-item definition, geographic scope, category mapping, feed presentation, admin & crawl config

---

## Free-item definition

| Option | Description | Selected |
|--------|-------------|----------|
| Price = €0 only | Strictest; matches regalo semantics | ✓ |
| €0 + title keywords | Broader catch via gratis/regalo/free | |
| Title keywords only | Highest false-positive risk | |

| Option | Description | Selected |
|--------|-------------|----------|
| Reject missing/ambiguous price | Only persist explicit €0 | ✓ |
| Accept missing + keywords | Keyword fallback | |
| Reject + paid-signal scan | Extra title heuristics | |

| Option | Description | Selected |
|--------|-------------|----------|
| Admin-configured catalog URLs | Operator-controlled target_urls | ✓ |
| Site-wide search then filter | Heavy crawl | |
| Empty start | Manual URL entry only | |

| Option | Description | Selected |
|--------|-------------|----------|
| Reject at extract layer | reason `not_free`; never persist | ✓ |
| Reject at persist/validation | Same outcome, different metrics | |
| Persist with admin review flag | MVP rejected | |

**User's choice:** €0 only; reject ambiguous price; admin URLs; extract-layer reject.

---

## Geographic scope

| Option | Description | Selected |
|--------|-------------|----------|
| Venice + Padova parity | Same cities as Subito | ✓ |
| Venice only | Narrower scope | |
| Wider Veneto | More supply, blurrier geo story | |

| Option | Description | Selected |
|--------|-------------|----------|
| Location in target URLs | Vinted location params in admin URLs | ✓ |
| Post-filter bbox only | Wider crawl + bbox reject | |
| Both URL + bbox | Belt and suspenders | |

| Option | Description | Selected |
|--------|-------------|----------|
| Require coords OR city label | Minimum geo bar | ✓ |
| Coords always required | Strictest | |
| City text only | Weak distance UX | |

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror Subito zone tagging | tagZone when coords exist | ✓ |
| City only, no zones | Simpler | |
| Defer zones | Follow-up task | |

| Option | Description | Selected |
|--------|-------------|----------|
| Seed default URL templates | Venice + Padova pre-seeded | ✓ |
| Empty target_urls | Manual only | |
| Full category×city matrix day one | Heavy crawl | |

| Option | Description | Selected |
|--------|-------------|----------|
| City from URL + JSON fallback | URL intent + JSON validation | ✓ |
| JSON only | Ignore URL city | |
| URL only | Ignore JSON city | |

| Option | Description | Selected |
|--------|-------------|----------|
| Reject outside bbox | Same Venice/Padova boxes as Subito | ✓ |
| Warn only | Persist anyway | |
| No bbox check | Trust URL filter | |

| Option | Description | Selected |
|--------|-------------|----------|
| Centroid fallback | Subito Phase 15 pattern | ✓ |
| City text only | No synthetic coords | |
| Reject no coords | Strictest | |

| Option | Description | Selected |
|--------|-------------|----------|
| Pickup location preferred | Meet-up over seller city | ✓ |
| Seller city only | Simpler | |
| Primary listing field only | No pickup logic | |

| Option | Description | Selected |
|--------|-------------|----------|
| Separate URL sets per city | Venice URLs + Padova URLs | ✓ |
| Single multi-city URL | Fewer URLs | |
| City-agnostic URLs | Post-filter only | |

| Option | Description | Selected |
|--------|-------------|----------|
| Reject ship-only | Local pickup required | ✓ |
| Persist ship-only | More supply | |
| Persist but hide from radius | Deferred complexity | |

**User's choice:** Full Venice+Padova parity with seeded URLs, bbox reject, centroid fallback, pickup location, separate URL sets, reject shipping-only.

---

## Category mapping

| Option | Description | Selected |
|--------|-------------|----------|
| Lookup table + inference fallback | Persist slug at scrape; hybrid | ✓ |
| Inference only | Weaker accuracy | |
| Table only; reject unmapped | Strictest | |

| Option | Description | Selected |
|--------|-------------|----------|
| Extend resolveCanonicalCategorySlug | vinted branch in resolver | ✓ |
| Scrape-time only | No vinted branch | |
| usato catch-all | Always categorized | |

| Option | Description | Selected |
|--------|-------------|----------|
| null (uncategorized) | Phase 12 D-08 behavior | ✓ (Claude discretion) |
| usato catch-all | Always under Other | |
| Reject unmapped | Don't persist | |

| Option | Description | Selected |
|--------|-------------|----------|
| One URL per slug × city | Category in URL metadata | ✓ |
| JSON category only | City-wide free search URLs | |
| URL hint + JSON override | Hybrid | |

| Option | Description | Selected |
|--------|-------------|----------|
| Document in canonical-categories module | CAT-03 pattern + tests | ✓ |
| CONTEXT.md only | Lighter docs | |
| Separate vinted module | Split from canonical | |

| Option | Description | Selected |
|--------|-------------|----------|
| No FilterSheet changes | 17 Subito labels unchanged | ✓ |
| Add source filter | Scope creep | |
| Rename labels source-neutral | Breaks 12.1 i18n | |

| Option | Description | Selected |
|--------|-------------|----------|
| Same translation pipeline | title_en/zh like Subito | ✓ |
| Skip translation MVP | Italian only | |
| Translate on detail open | Deferred | |

| Option | Description | Selected |
|--------|-------------|----------|
| Add vinted to ListingSource enum | DB + scraper + lib migration | ✓ |
| Store as subito | Wrong provenance | |
| Generic scraped source | Over-broad | |

| Option | Description | Selected |
|--------|-------------|----------|
| Many-to-one mapping OK | Fine-grained Vinted → 17 slugs | ✓ |
| Strict 1:1 only | Reject ambiguous | |
| Primary category only | Pick first | |

**User's choice:** Hybrid map + resolver extension; null fallback (Claude discretion); URL-per-slug; module docs; no filter UI change; translation parity; vinted enum; many-to-one OK.

---

## Feed presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Mixed chronological feed | posted_at sort across sources | ✓ |
| Subito-first tie-break | Source priority | |
| Separate tabs | Scope creep | |

| Option | Description | Selected |
|--------|-------------|----------|
| Source badge on grid card | Vinted chip + FREE badge | ✓ |
| Badge on detail only | Cleaner grid | |
| No badge | Hide provenance | |

| Option | Description | Selected |
|--------|-------------|----------|
| No source filter | Deferred capability | ✓ |
| FilterSheet source multi-select | New feature | |
| Admin-only source visibility | No consumer affordance | |

| Option | Description | Selected |
|--------|-------------|----------|
| External URL new tab | Same as Subito scraped | ✓ |
| Vinted app deep link | Fragile | |
| Copy link only | Weak UX | |

| Option | Description | Selected |
|--------|-------------|----------|
| FREE badge on Vinted cards | Consistent with Subito | ✓ |
| Vinted badge instead of FREE | Redundant | |
| No FREE badge | Source only | |

| Option | Description | Selected |
|--------|-------------|----------|
| Favorites identical | Heart + login gate | ✓ |
| Exclude Vinted favorites | Inconsistent | |
| Group by source | Scope creep | |

| Option | Description | Selected |
|--------|-------------|----------|
| Search includes Vinted | Same feed search box | ✓ |
| Exclude from search | Inconsistent | |
| Separate Vinted search | Scope creep | |

**User's choice:** Mixed feed, source chip, no source filter, external link, FREE badge, favorites + search parity.

---

## Admin & crawl config

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse Subito HttpCrawler stack | New scraper/src/vinted/ module | ✓ |
| Playwright-first | Heavier default | |
| MVP without incremental | Faster but costly runs | |

| Option | Description | Selected |
|--------|-------------|----------|
| Shared global proxy_enc | Phase 16 fallback applies | ✓ |
| Per-source proxy | More admin UI | |
| Direct-only Vinted | Block risk | |

| Option | Description | Selected |
|--------|-------------|----------|
| live + enabled=false | Operator enables after review | ✓ |
| live + enabled | Auto-crawl on deploy | |
| stay coming_soon | Extra flip step | |

| Option | Description | Selected |
|--------|-------------|----------|
| 90 min default interval | Same as Subito | ✓ |
| 3h default | Lower cost | |
| Manual only MVP | No cron | |

| Option | Description | Selected |
|--------|-------------|----------|
| Wave 0 spike required | 3 live URLs hard gate | ✓ |
| Skip spike | Higher rework risk | |
| Research-only spike | No plan gate | |

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror Subito admin UI | Chip matrix + run stats | ✓ |
| Minimal admin | URL list only | |
| Merge into Subito page | Confusing | |

**User's choice:** Subito crawl stack reuse, shared proxy, live/disabled default, 90min interval, Wave 0 spike gate, full admin UI parity.

---

## Claude's Discretion

- **Unmapped category fallback:** `null` (uncategorized) rather than `usato` — aligns with Phase 12 D-08.

## Deferred Ideas

- Consumer source filter in FilterSheet
- Separate feed source tabs
- Favorites grouped by source
- Separate Vinted search
- Vinted app deep links
- Skip translation MVP
- Minimal admin UI without Subito parity
