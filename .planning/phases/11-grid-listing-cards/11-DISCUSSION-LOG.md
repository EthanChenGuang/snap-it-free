# Phase 11: Grid Listing Cards - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 11-Grid Listing Cards
**Areas discussed:** FREE badge placement & style, Card frame & image ratio, Heart overlay & favorited state, Metadata & status badges, Card reuse scope

---

## FREE Badge Placement & Style

| Option | Description | Selected |
|--------|-------------|----------|
| Image overlay top-left | Matches CARD-03; keeps title row clean | ✓ |
| Image overlay top-right | May crowd heart | |
| Inline with title | Stitch prototype pattern | |
| You decide | Claude picks within Stitch | |

**User's choice:** As it is now (overlay top-left)

| Option | Description | Selected |
|--------|-------------|----------|
| Stitch monochrome chip | #f1f1f0 bg, thin border | |
| White chip with border | Prototype "New Arrival" pattern | |
| Minimal text-only | White text + shadow | |
| Keep emerald glass pill | Current green signal | ✓ |

**User's choice:** Keep emerald glass pill (Stitch deviation accepted)

| Option | Description | Selected |
|--------|-------------|----------|
| Trilingual via messages.listing.free | zh/en/it | ✓ |
| Always "FREE" English | | |
| Always "GRATIS" | | |

| Option | Description | Selected |
|--------|-------------|----------|
| All listings (scraped + UGC) | CARD-03 both sources | ✓ |
| Scraped only | | |
| UGC only | | |

---

## Card Frame & Image Ratio

| Option | Description | Selected |
|--------|-------------|----------|
| Portrait 4:5 | Current waterfall polish | ✓ |
| Square 1:1 | | |
| Landscape 16:9 | Stitch prototype | |

| Option | Description | Selected |
|--------|-------------|----------|
| Image-only minimal | No outer bordered wrapper | ✓ |
| Full Stitch card | White bg + border + padding | |

| Option | Description | Selected |
|--------|-------------|----------|
| rounded-2xl | Current | ✓ |
| Stitch 8px | DESIGN.md | |
| Stitch 4px | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Image zoom on hover | scale-105 | ✓ |
| No hover | | |
| Border highlight | | |

---

## Heart Overlay & Favorited State

| Option | Description | Selected |
|--------|-------------|----------|
| Keep glass circle | bg-black/30 + blur | ✓ |
| Flat white circle | | |
| No background | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep orange filled | text-accent-orange | ✓ |
| Stitch black filled | | |
| Red error | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Single heart in ListListingCard | Remove Favorites wrapper | ✓ |
| Wrapper only on favorites | | |
| Keep both | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Top-right | Current; clears FREE top-left | ✓ |
| Top-right lower | | |
| Bottom-right | | |

---

## Metadata & Status Badges

| Option | Description | Selected |
|--------|-------------|----------|
| Hide category | Title + metadata only | ✓ |
| Show chip | | |
| Show in metadata line | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Hide source | Detail only | ✓ |
| Show overlay badge | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep in grid + metadata suffix | Not filter out claimed | ✓ |
| Hide claimed from grid | | |
| Reserved overlay badge | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Distance + time only | No redundant city | ✓ |
| Distance + city + time | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Suffix metadata | "… · Reserved" | ✓ |
| Replace metadata | Reserved only | |
| Prefix metadata | | |

| Option | Description | Selected |
|--------|-------------|----------|
| line-clamp-1 title | | ✓ |
| line-clamp-2 | | |

| Option | Description | Selected |
|--------|-------------|----------|
| You decide (no-coord fallback) | Claude → Phase 10 city · time | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| text-xs metadata | Current | ✓ |
| text-label-sm | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Dim image when claimed | opacity reduction | ✓ |
| Metadata suffix only | | |

---

## Card Reuse Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Single ListListingCard everywhere | Feed + favorites + list | ✓ |
| Separate variants | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Pass distance on favorites | When center active | ✓ |
| Never distance on favorites | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Polish applies to ListPageClient too | | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Whole card tappable → detail | No Claim on grid | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| ListingPhoto placeholder | Missing photos | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current grid gap | As-is (gap-3) | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| New i18n keys for Reserved | Grid suffix | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep favorite toast | | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Uppercase CSS on FREE badge | | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| No card skeleton | | ✓ |

---

## Claude's Discretion

- No-coord metadata fallback → Phase 10 city · time (user said "you decide")
- Exact claimed image opacity; reserved key reuse vs new feed key

## Deferred Ideas

- Filter claimed listings from feed entirely (user chose suffix + dim)
- Card skeleton loading
- Stitch monochrome badge/heart restyle
- Category and source badges on grid
