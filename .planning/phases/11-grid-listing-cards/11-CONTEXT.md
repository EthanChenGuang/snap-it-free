# Phase 11: Grid Listing Cards - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 polishes **`ListListingCard`** for the two-column home feed and favorites grid: FREE badge, favorite heart, simplified metadata, and claimed-state treatment. **No Claim CTA on grid cards** (CARD-05); detail page keeps deep-link (scraped) and claim/reserve (UGC).

Requirements in scope: **CARD-01–05**, **I18N-01** (partial — grid card strings including Reserved suffix if new keys needed).

**Explicitly out of scope:** Filter sheet / haversine pipeline changes (Phase 10 locked D-60–65); favorites category folders (Phase 12); Select Location expansion (Phase 13); card skeleton loading states; category/source chips on grid; server-side query changes for claimed filtering.

**Functional baseline:** Phase 10 already wired distance · time metadata, consumer city labels, and card-internal `FavoriteButton`. Phase 11 is primarily **visual polish + metadata/claimed UX + favorites double-heart fix**, with one explicit **Stitch override** (emerald FREE pill retained by user choice).

</domain>

<decisions>
## Implementation Decisions

### FREE Badge (CARD-03)

- **D-01:** **Image overlay top-left** — keep current placement on photo (`left-space-sm top-space-sm`); do not move FREE inline with title. — **Reversibility:** reversible — layout-only.
- **D-02:** **Keep emerald glass FREE pill** — retain `bg-emerald-500/80` + backdrop blur styling (user preference over Stitch monochrome chip). Document as intentional deviation from DESIGN.md chip pattern. — **Reversibility:** reversible — CSS-only.
- **D-03:** **Trilingual FREE label** — use `messages.listing.free` (zh 免费 / en Free / it equivalent); apply **uppercase CSS** on badge text. — **Reversibility:** reversible.
- **D-04:** **All listings get FREE badge** — both scraped Subito and UGC community posts on grid. — **Reversibility:** reversible.

### Card Frame & Image

- **D-05:** **Portrait 4:5** — keep `aspect-[4/5]` on card image. — **Reversibility:** reversible.
- **D-06:** **Image-only minimal layout** — no outer Stitch bordered card wrapper (white bg + padding + notion-border); image + text stack below only. — **Reversibility:** reversible.
- **D-07:** **Keep rounded-2xl** on image container (not Stitch 8px card radius). — **Reversibility:** reversible.
- **D-08:** **Hover image zoom** — keep `group-hover:scale-105` on photo. — **Reversibility:** reversible.

### Heart Overlay (CARD-04)

- **D-09:** **Keep glass heart circle** — `bg-black/30` + `backdrop-blur-md` on heart button (current overlay tone). — **Reversibility:** reversible.
- **D-10:** **Keep orange favorited state** — filled heart uses `text-accent-orange` when favorited. — **Reversibility:** reversible.
- **D-11:** **Single heart per card** — heart lives only inside `ListListingCard`; **remove** absolute `FavoriteButton` wrapper overlay from `FavoritesPageClient`. — **Reversibility:** costly — touches favorites layout but fixes duplicate-heart bug.
- **D-12:** **Heart top-right** on image (`right-space-sm top-space-sm`); FREE badge stays top-left. — **Reversibility:** reversible.

### Metadata & Status (CARD-01, CARD-02)

- **D-13:** **Hide category on grid** — no category chip or metadata segment on grid cards. — **Reversibility:** reversible.
- **D-14:** **Hide source on grid** — no Subito / Community badge on grid cards. — **Reversibility:** reversible.
- **D-15:** **Claimed listings remain in grid** — do not filter out `status === 'claimed'` from feed query this phase; indicate via metadata + visual dimming (D-21). — **Reversibility:** costly — changes browse semantics if later filtered server-side.
- **D-16:** **Distance + time only when center active** — metadata `{distance} · {time}`; do not append city when distance shown (aligns with Phase 10 D-61). — **Reversibility:** reversible.
- **D-17:** **Reserved suffix on metadata line** — when claimed: append ` · {reserved}` suffix, e.g. `"2.3 km · 3h ago · Reserved"`. — **Reversibility:** reversible.
- **D-18:** **Title single line** — `line-clamp-1` on card title. — **Reversibility:** reversible.
- **D-19:** **No-coord / no-center fallback** — when distance unavailable, show **city · time** per Phase 10 D-38/D-63 (planner discretion: user deferred). — **Reversibility:** reversible.
- **D-20:** **Metadata typography** — keep `text-xs text-on-surface-variant` on metadata line. — **Reversibility:** reversible.
- **D-21:** **Dim claimed card image** — reduce photo opacity (e.g. `opacity-60`) when listing is claimed, in addition to Reserved suffix (D-17). — **Reversibility:** reversible.

### Card Reuse & Behavior (CARD-05)

- **D-22:** **Single `ListListingCard` component** — same polished card on home feed (`FeedHomeClient`), favorites (`FavoritesPageClient`), and legacy `ListPageClient` if still rendered. — **Reversibility:** reversible.
- **D-23:** **Distance on favorites when center active** — pass `distanceMeters` prop on favorites grid same as feed (reuse browse center + haversine pipeline). — **Reversibility:** reversible.
- **D-24:** **Whole card navigates to detail** — keep `article` with `role="link"` + keyboard activation; heart uses `stopPropagation`. No Claim button on grid. — **Reversibility:** reversible.
- **D-25:** **Missing photo placeholder** — keep `ListingPhoto` gray surface placeholder behavior. — **Reversibility:** reversible.
- **D-26:** **Keep current grid gap** — preserve existing gap between cards (`gap-3` in `FeedHomeClient`; match on favorites). — **Reversibility:** reversible.
- **D-27:** **Keep favorite toast** — retain toast on favorite add/remove from grid. — **Reversibility:** reversible.
- **D-28:** **No card skeleton loading** — page-level loading/empty only; no per-card skeleton placeholders. — **Reversibility:** reversible.

### Internationalization (I18N-01 partial)

- **D-29:** **Reserved grid suffix i18n** — add or wire trilingual Reserved label for grid metadata suffix (zh/en/it). Prefer `messages.listing.reserved` if copy fits; add `messages.feed.cardReserved` only if grid needs shorter distinct copy. — **Reversibility:** reversible.

### Inherited from Phase 10 (do not rework)

- **D-30:** **Distance pipeline locked** — Phase 11 does not change haversine, `useDistanceCenter`, filter composition, or `formatDistance` (Phase 10 D-65). Cards consume `distanceMeters` prop only.

### Claude's Discretion

- Exact opacity value for claimed image dimming (D-21).
- Whether to reuse `messages.listing.reserved` vs new `messages.feed.cardReserved` key (D-29).
- No-coord metadata edge cases when claimed + no city (compose suffix without breaking line-clamp).
- Minor heart/FREE badge spacing tweaks on smallest mobile widths.
- Favorites grid gap class alignment with feed if `gap-space-md` vs `gap-3` drift exists.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — v2.0 milestone; grid card polish goal
- `.planning/REQUIREMENTS.md` — CARD-01–05, I18N-01 traceability
- `.planning/ROADMAP.md` — Phase 11 goal, success criteria, depends on Phase 10

### Prior Phase Context
- `.planning/phases/10-search-filter-sheet-distance/10-CONTEXT.md` — Distance metadata locked (D-60–65); city-only labels (D-38); Phase 11 scope split
- `.planning/phases/09-feed-first-home-navigation-ia/09-CONTEXT.md` — Two-column grid, ListListingCard reuse (D-38–39)

### Design Authority
- `.planning/google-stitch-ui-design/DESIGN.md` — Stitch tokens (note D-02/D-07 user overrides emerald pill + rounded-2xl)
- `.planning/google-stitch-ui-design/listing_feed_notion_style/code.html` — Feed grid reference (adapt: no Claim on grid, portrait ratio per D-05)

### Quick Polish Context (already partially applied)
- `.planning/quick/20260810-waterfall-feed-polish/SUMMARY.md` — emerald FREE, glass heart, gap-3, rounded-2xl baseline
- `.planning/quick/20260810-feed-ui-polish/SUMMARY.md` — feed chrome polish (cards inherit gap/icon context)

### Codebase Maps
- `.planning/codebase/STRUCTURE.md` — component locations
- `.planning/codebase/CONVENTIONS.md` — i18n, Stitch styling patterns

### Implementation Touchpoints
- `components/listings/ListListingCard.tsx` — primary polish target
- `components/listings/FavoriteButton.tsx` — overlay tone, orange favorited, auth gate, toast
- `components/listings/FavoritesPageClient.tsx` — remove duplicate heart wrapper (D-11)
- `components/listings/FeedHomeClient.tsx` — passes `distanceMeters`; grid gap
- `components/listings/ListPageClient.tsx` — legacy list path; same card
- `components/listings/ListingPhoto.tsx` — placeholder for missing photos
- `lib/geo/format-distance.ts` — read-only; smart metric units
- `messages/zh.ts`, `messages/en.ts`, `messages/it.ts` — `listing.free`, `listing.reserved`, any new feed card keys

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ListListingCard` — already has FREE overlay, heart, metadata line, navigation to detail; needs claimed suffix/dim + favorites dedupe
- `FavoriteButton` — auth gate, overlay tone, orange fill, toast; reuse unchanged behavior
- `ListingPhoto` — image + placeholder
- `formatDistance` + `buildCardMetadata` pattern — extend for Reserved suffix when `listing.status === 'claimed'`

### Established Patterns
- Portrait grid cards with emerald FREE + glass heart from waterfall quick polish (user wants to retain)
- Phase 10 metadata: distance · time OR city · time fallback via `listingConsumerCityLabel`
- i18n via `useMessages()` + `messages/{zh,en,it}.ts`
- Whole-card click with heart `stopPropagation`

### Integration Points
- **`FeedHomeClient`** — continue passing `distanceMeters` from distance map
- **`FavoritesPageClient`** — remove wrapper `FavoriteButton`; pass `distanceMeters` when center active (D-23)
- **`ListPageClient`** — inherit polished card automatically if still used
- **Detail routes** — unchanged; CARD-05 satisfied by omitting Claim on grid

</code_context>

<specifics>
## Specific Ideas

- User wants visual language **as it is now** for FREE placement, emerald pill, glass heart, orange favorited — not full Stitch monochrome conversion for badges/hearts.
- User explicitly chose **simplified grid metadata**: no category, no source, distance-only when available.
- Claimed items: **visible in grid** with dimmed photo + `"… · Reserved"` suffix (not hidden, not overlay badge).
- Fix **double heart on Favorites** — single heart inside card only.

</specifics>

<deferred>
## Deferred Ideas

- **Filter claimed listings from feed query** — user chose show-with-suffix over hide-from-grid (D-15).
- **Card skeleton loading placeholders** — user declined (D-28).
- **Stitch monochrome FREE/heart restyle** — user rejected in favor of current emerald/glass/orange (D-02, D-09, D-10).
- **Category/source on grid cards** — deferred; detail + filters suffice (D-13, D-14).

</deferred>

---

*Phase: 11-Grid Listing Cards*
*Context gathered: 2026-08-10*
