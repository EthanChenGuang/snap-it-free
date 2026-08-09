# Phase 9: Feed-First Home & Navigation IA - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-09
**Phase:** 9-Feed-First Home & Navigation IA
**Areas discussed:** Feed header chrome, Map secondary entry, Route migration, Favorites interim, Filter stub, Grid shell, Settings chrome, Location persist, Post tab UX, Nav i18n

---

## Feed Header Chrome

| Option | Description | Selected |
|--------|-------------|----------|
| Unified Header | HOME-02 row on all consumer routes | ✓ |
| Feed-only top bar | Search row only on `/` | |
| Evolve Header | Keep hamburger structure | |

| Option | Description | Selected |
|--------|-------------|----------|
| Remove hamburger | Bottom nav + row actions only | ✓ |
| Keep hamburger | Drawer for Post/overflow | |

| Option | Description | Selected |
|--------|-------------|----------|
| Always-visible search | Inline field in header row | ✓ |
| Compact locale chip | 中/EN/IT at row start | ✓ |
| Scroll-away header | Hides on scroll down | ✓ |
| Desktop container-max | Centered wider row on md+ | ✓ |
| Title on Settings only | No app title on feed header | ✓ |
| Zone chips map-only | Not on feed | ✓ |
| Category via filter only | Remove inline chips | ✓ |

**User's choice:** Unified search row; no hamburger; scroll-away; locale chip; zone/category per above.
**Notes:** User initially suggested Post in bottom nav — confirmed **4-tab override** of NAV-02 (Home · Post · Favorites · Settings).

---

## Map Secondary Entry → Select Location

| Option | Description | Selected |
|--------|-------------|----------|
| `/select-location` route | Not `/map` | ✓ |
| Fixed center pin + Confirm | Pan map, confirm returns to feed | ✓ |
| Not browse-all-pins | Rejected pin-tap-to-detail browse map | ✓ |
| Locate Me | Keep geolocation recenter | ✓ |
| Hide nav + search row | Full-bleed select-location | ✓ |
| Back + location toggle | Both exit paths | ✓ |
| Zone chips on view | Centro/Mestre/Lido + Padova | ✓ |
| Search feed-only | Query does not filter map | ✓ |

**User's choice:** Select-location flow with bottom 「Confirm location」 button.
**Notes:** User clarified map purpose after initially describing pin-tap behavior — locked to center-pin confirm pattern.

---

## Route Migration

| Option | Description | Selected |
|--------|-------------|----------|
| `/` = feed grid | Map demoted | ✓ |
| `/list` permanent redirect | Planner discretion | ✓ |
| `/select-location` | Location flow URL | ✓ |
| Keep `/post`, `/favorites`, admin, detail | Unchanged | ✓ |

**User's choice:** Accept v2 pivot; `/list` merges into feed.

---

## Favorites Interim

| Option | Description | Selected |
|--------|-------------|----------|
| Flat list restyled | 2-col grid, not folders | ✓ |
| Login gate | Anonymous sign-in prompt | ✓ |
| Simple title bar | No search row on favorites | ✓ |
| No folder teaser | Phase 12 silent | ✓ |

---

## Filter Stub

| Option | Description | Selected |
|--------|-------------|----------|
| Filter icon stub toast | i18n "coming soon" | ✓ |
| Remove inline category chips | Phase 10 sheet | ✓ |
| No active pills | Phase 10 | ✓ |
| Search title + description | Phase 9 scope | ✓ |
| Location confirm no feed filter | Persist only until Phase 10 | ✓ |

---

## Grid Shell

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse ListListingCard | Phase 11 polishes | ✓ |
| grid-cols-2 mobile | Planner discretion | ✓ |
| gap-space-md | Planner discretion | ✓ |
| Newest first | posted_at desc | ✓ |
| Stitch empty state | Bordered panel | ✓ |
| Load all active | No infinite scroll | ✓ |

---

## Settings Chrome

| Option | Description | Selected |
|--------|-------------|----------|
| Nav chrome only | Content restyle Phase 14 | ✓ |

---

## Post Tab UX

| Option | Description | Selected |
|--------|-------------|----------|
| Auth gate on tap | Sign-in before post | ✓ |
| Full page `/post` | Planner discretion | ✓ |

---

## Nav i18n

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm location labels | zh/en/it full phrase | ✓ |
| New nav label set | Planner discretion zh/en/it | ✓ |

---

## Claude's Discretion

- Bottom nav active state styling (within Stitch filled + bold)
- `/list` redirect mechanism (Next.js permanent redirect)
- Browse center storage key + context provider shape
- Post icon `add_box`; manage-post link on Settings
- Pull-to-refresh retention
- MapExplorer refactor structure

## Deferred Ideas

- Filter sheet, radius, pills → Phase 10
- Card polish → Phase 11
- Favorites folders → Phase 12
- UGC post location + filter center expansion → Phase 13
- Settings DND/delete → Phase 14
- Browse-all-pins map (not requested)
