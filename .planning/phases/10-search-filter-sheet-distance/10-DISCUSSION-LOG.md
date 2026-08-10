# Phase 10: Search, Filter Sheet & Distance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 10-Search, Filter Sheet & Distance
**Areas discussed:** Radius center source, Listings without coordinates, Zone/Padova placement (city-only override), Category multi-select, Filter sheet apply flow, Distance on cards, Active pills layout, Search query pills, Filter sheet chrome, Filter state architecture, i18n copy

---

## Radius Center Source

| Option | Description | Selected |
|--------|-------------|----------|
| Browse center first | Use `/select-location` Confirm pin; GPS fallback when unset | ✓ |
| GPS first | Device geolocation primary | |
| Browse center only | No automatic GPS | |

**User's choice:** Browse center primary with GPS fallback chain (GPS when no center → Venice default when GPS denied). Browse center always wins when both exist. One-shot GPS (no watch). Nearest-first sort when center active. Default radius 10 km. Radius off = no filter. Smart units (m / km). Center pill with trilingual labels; tap opens select-location. Client-side haversine. Pure geographic circle (not zone-constrained).

**Notes:** User requested extensive follow-up (19 decisions) on this area before moving on.

---

## Listings Without Coordinates

| Option | Description | Selected |
|--------|-------------|----------|
| Exclude when radius ON | Hide listings missing lat/lng when radius active | ✓ |
| Sort last | Show at bottom | |
| Show all | Always visible | |

**User's choice:** Exclude when radius on; show normally when radius off. Omit distance on cards (time-only). Both lat AND lng required. Same rule for UGC/scraped. No UI hint for hidden listings. Standard empty search state.

---

## Zone/Padova Placement (City-Only Override)

| Option | Description | Selected |
|--------|-------------|----------|
| City-only filter | Venice vs Padova; never show zone names | ✓ |
| Zone chips in sheet | Keep Centro/Mestre/Lido | |

**User's choice (freeform):** "From now on, show the city name only, never show the zone name again." Confirmed city-only filter (All · Venice · Padova). Remove zone chips from select-location. Dismissible city pill. City from data field mapping. Independent of pin Confirm. Trilingual city names. Alerts unchanged. Consumer UI only — zone enum retained in data layer.

**Notes:** Supersedes FILT-04 zone-chip requirement and Phase 9 D-22 for consumer UX.

---

## Category Multi-Select

| Option | Description | Selected |
|--------|-------------|----------|
| OR logic | Match ANY selected category | ✓ |
| AND logic | Match ALL selected | |

**User's choice:** Checkbox list in sheet; one pill per category; none selected = all; OR logic; persist in localStorage; migrate to `selectedCategories: string[]`; sheet order Radius → City → Categories; "Clear selection" link; no live result count.

---

## Filter Sheet Apply Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Draft then Apply | Changes apply on Apply button only | ✓ |
| Live apply | Immediate on toggle | |

**User's choice:** Reset clears radius/city/categories only (not browse center or search). Close without Apply discards draft. Vaul Drawer. Slider + Off toggle. Dot badge on filter icon. Replace stub toast with sheet open.

---

## Distance on Cards

| Option | Description | Selected |
|--------|-------------|----------|
| Basic distance Phase 10 | Add metadata line now; Phase 11 polish badge/heart | ✓ |
| Defer all to Phase 11 | No card UI this phase | |

**User's choice:** `{distance} · {time}` below title; smart units; city or time when no center; live recompute; Phase 11 reuses pipeline.

---

## Additional Areas (Pills, Search, Chrome, State, i18n)

**Pills:** Order Search → Center → Radius → City → Categories; wrap multiline; radius pill "Within X km"; search pill live with dismiss.

**Sheet chrome:** "Filters" title; auto max 85vh; swipe/overlay dismiss; Stitch monochrome.

**State:** New FeedFilterContext; `shoumanwu_filter_prefs` JSON; draft memory-only; hydrate on mount.

**i18n:** `messages.feed.*`; remove filterComingSoon; reuse emptySearch strings.

---

## Claude's Discretion

FeedFilterContext file layout, haversine util location, search pill truncation, slider step size, drawer snap tuning, center pill label source.

## Deferred Ideas

- Migrate alerts to city-only (later phase)
- Live result count in filter sheet
- Radius-specific empty state copy
- Zone names anywhere in consumer UI (explicitly rejected)
