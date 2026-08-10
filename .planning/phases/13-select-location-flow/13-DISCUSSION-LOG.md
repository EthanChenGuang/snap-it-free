# Phase 13: Select Location Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 13-Select Location Flow
**Areas discussed:** Post vs browse entry, Location preview content, Pin interaction model, Radius in post context, Confirm & return navigation, Stitch visual polish

---

## Post vs Browse Entry

| Option | Description | Selected |
|--------|-------------|----------|
| Same route + ?context=post | One screen, query param switches behavior | ✓ |
| Inline map on PostForm | No navigation to /select-location | |
| Replace GPS toggle | Tappable location row opens map picker | ✓ |
| sessionStorage draft | Coords return via shoumanwu_post_draft | ✓ |
| Map required before submit | locationConfirmed gate | ✓ |
| Independent stores | Post draft ≠ browse center | ✓ |
| Derive zone from coords | Hide zone UI on post form | ✓ |

**User's choice:** Single `/select-location` route with `?context=post`; replace GPS toggle with location row; sessionStorage draft; map pick required; independent from browse center; derive zone server-side on submit.

**Notes:** 20 follow-up questions across 5 batches — titles, auth, back-without-confirm, deep-link policy, draft preservation all locked.

---

## Location Preview Content

| Option | Description | Selected |
|--------|-------------|----------|
| City name only | Venice/Padova trilingual, no geocode | ✓ |
| Live update | Recalculate on every pin move | ✓ |
| Replace static placeholder | Show city not "Selected location" | ✓ |
| Nearest-centroid heuristic | resolveCityLabel | ✓ |
| City label satisfies LOC-01 | No street geocoding | ✓ |
| aria-live polite | Screen reader updates | ✓ |

**User's choice:** City-only live preview; browse confirm stores city name (not "My location"); no coords shown; separate from radius UI.

---

## Pin Interaction Model

| Option | Description | Selected |
|--------|-------------|----------|
| Tap-to-place | Click moves pin; pan does not | ✓ |
| Red pin + drop animation | Keep current SelectLocationRedPin | ✓ |
| Radius/radar browse-only | Hidden in post context | ✓ |
| Reuse SelectLocationMapPane | context prop for radius visibility | ✓ |
| OpenFreeMap Liberty | Current tile style | ✓ |
| Auto-fit on radius change | fitMapToRadius | ✓ |

**User's choice:** Tap-to-place with pixel overlay pin; keep red pin as documented Stitch exception; locate FAB retained.

---

## Radius in Post Context

| Option | Description | Selected |
|--------|-------------|----------|
| Hide all radius UI in post | No chips, circle, or radar | ✓ |
| Post confirm no filter prefs | No applyMapFilterPrefs | ✓ |
| Browse keeps map radius presets | 5/10/50/100 km on map | ✓ |
| Browse confirm applyMapFilterPrefs | Map mode + radius + city All | ✓ |

**User's choice:** User asked for clarification on browse radius — confirmed keep presets on map (not filter sheet). Post context coords-only.

---

## Confirm & Return Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Browse → router.back() | Return to feed | ✓ |
| Post → router.push('/post') | After sessionStorage save | ✓ |
| Context-specific confirm copy | Confirm location vs Confirm pickup | ✓ |
| Immediate feed update | BrowseCenterProvider | ✓ |
| Block submit without confirm | Validation error | ✓ |
| Back without confirm | No side effects | ✓ |

**User's choice:** sessionStorage shape `{ lat, lng, label, locationConfirmed }`; location fields only in draft (not full form).

---

## Stitch Visual Polish

| Option | Description | Selected |
|--------|-------------|----------|
| Flat bottom panel | No shadow, thin border, rounded-lg | ✓ |
| Minimal header | Back + centered title | ✓ |
| Adapt map_explorer prototype | Strip bottom sheet | ✓ |
| Stitch radius pills | Light gray rounded-full chips | ✓ |
| Light circle locate FAB | border-outline-variant | ✓ |
| Full viewport | Hide AppChrome header/nav | ✓ |
| Document red pin exception | Like Phase 11 FREE badge | ✓ |

**User's choice:** Monochrome Stitch polish with documented red-pin exception.

---

## Claude's Discretion

- Post draft merge logic, component refactor shape, zone derivation helper location, i18n key names, FAB positioning.

## Deferred Ideas

- Reverse geocode / street addresses
- Full PostForm sessionStorage draft
- Deep-link post context URL
- Re-add center pill to feed header
- "My location" browse label (superseded by city on map confirm)
