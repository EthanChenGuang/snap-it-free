---
quick_id: 260803-wi0
status: complete
---

# Summary: Research Italian & European free-item sources beyond Subito

## Outcome

Italy-wide research shows **almost no second scraper is worth building**. The largest win is expanding the existing Subito adapter from Veneto to national seeds (~39.5k free listings vs ~4.8k Veneto). Facebook holds the real giveaway supply and is not scrapable; Junker is partnership-only; the best public API (trashnothing) has zero Italian inventory; Wallapop's free-price API is excellent but measured Italian free stock is ~11 items across 8 metros.

Deliverable: `.planning/quick/260803-wi0-free-item-source-candidates/260803-wi0-RESEARCH.md` (ranked tiers A–E, legal notes, measurements).

## Key findings

1. **Subito national expansion > any new source** — same code path; pagination disallowed so scale via more seeds; must lift Venice bbox + expand centroids first.
2. **Italian classifieds consolidated hard** — Kijiji, eBay Annunci, Portaportese, secondamano.it dead; Vivastreet → adult site; Bakeca has no free category.
3. **Wallapop demoted after measurement** — 11 IT free items @ 80 km × 8 cities; without distance filter returns Spanish €0 spam.
4. **teloregalo.app** — clean JSON-LD + permissive robots, but sitemap newest listing **2026-07-11** and low volume.
5. **No item-level Italian open data** for reuse — only facility registries and aggregate tonnage.
6. **STATE.md robots blocker was overstated** — prohibition is a `#` comment; machine rules `Allow: /` but disallow `?o=` pagination. Reworded in STATE.md.

## Artifacts

- `260803-wi0-PLAN.md`
- `260803-wi0-RESEARCH.md`
- `260803-wi0-SUMMARY.md`
- STATE.md Quick Tasks row + blocker correction

## Commits

(filled by orchestrator docs commit)
