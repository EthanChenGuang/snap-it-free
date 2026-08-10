---
phase: 13-select-location-flow
verified: 2026-08-10T21:51:00Z
status: human_needed
score: 20/20 must-haves verified
behavior_unverified: 4
overrides_applied: 0
behavior_unverified_items:

  - truth: "Live city preview updates as pin moves (tap or locate-me)"
    test: "Open /select-location; tap map or use locate-me FAB"
    expected: "Preview row shows Venice or Padova label matching pin position; aria-live announces change"
    why_human: "resolveCityLabel wired on markerPosition; runtime map interaction and screen-reader announcement require browser"

  - truth: "Confirm button disabled until map ready"
    test: "Hard-refresh /select-location and observe bottom panel before map loads"
    expected: "Confirm button disabled with opacity-50; becomes enabled once ready=true"
    why_human: "disabled={!ready} present in code; load timing and tap prevention need runtime check"

  - truth: "Post-context round trip persists pickup coords without touching browse prefs"
    test: "From /post tap location row → /select-location?context=post → Confirm → return to /post"
    expected: "PostForm row shows confirmed city label; sessionStorage shoumanwu_post_draft has lat/lng/label/locationConfirmed:true; shoumanwu_browse_center and filter prefs unchanged"
    why_human: "writePostDraft + readPostDraft chain is unit-tested; cross-route sessionStorage isolation requires browser"

  - truth: "Stitch flat-card styling on confirm panel, radius chips, locate-me FAB"
    test: "Visual inspect /select-location browse context floating controls"
    expected: "Confirm panel rounded-lg border-outline-variant without heavy drop shadow; radius chips solid bg-surface-container-lowest; locate-me FAB border-only circle"
    why_human: "Grep confirms anti-patterns removed; pixel-level Stitch conformance requires visual UAT"

human_verification:

  - test: "Open /select-location browse; tap map to move pin"
    expected: "Live city preview updates; red pin drop animation on tap"
    why_human: "D-14/D-22/D-24 runtime behaviors"

  - test: "Open /post; tap location row; confirm pickup on map"
    expected: "Returns to PostForm with city label shown; submit allowed; radius UI hidden on map"
    why_human: "End-to-end post flow spans two routes and context branching"

  - test: "Open /select-location browse; press Back without Confirm"
    expected: "Browse center and filter prefs unchanged"
    why_human: "D-38 no-write-on-back is grep-verified; runtime storage check needs browser"

open_items:

  - id: D-12
    type: developer_decision
    summary: "PostForm photo/title/description reset on navigate-out-and-back to picker"
    disposition: "OPEN — documented UX regression vs pre-Phase-13 inline toggle; follow-up phase candidate"
---

# Phase 13: Select Location Flow Verification Report

**Phase Goal:** Full-screen map picker with fixed center pin, locate FAB, preview, confirm — for filter center and UGC post.

**Verified:** 2026-08-10T21:51:00Z  
**Status:** human_needed  
**Re-verification:** No — initial verification (includes Plan 05 gap closure cherry-pick for green build/test gate)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | ------- | ---------- | -------------- |
| 1 | `resolveCityLabel` promoted to shared util with nearest-centroid Venice/Padova logic (D-16, LOC-01) | ✓ VERIFIED | `lib/geo/resolve-city-label.ts:3-14`; 4 tests pass in `resolve-city-label.test.ts` |
| 2 | `readPostDraft` / `writePostDraft` on `shoumanwu_post_draft` with coordinate validation (D-07, D-36, LOC-02) | ✓ VERIFIED | `lib/post-draft/storage.ts`; 8 tests pass; `writePostDraft` always sets `locationConfirmed: true` |
| 3 | Partial draft with valid coords but missing confirmation returns `locationConfirmed: false` (malformed-draft-as-unconfirmed) | ✓ VERIFIED | `storage.ts:23-28`; test in `storage.test.ts` |
| 4 | `?context=post` branches browse vs post; default is browse (D-01, LOC-03) | ✓ VERIFIED | `SelectLocationClient.tsx:54-55` |
| 5 | PostForm replaces GPS toggle with tappable row → `/select-location?context=post` (D-02) | ✓ VERIFIED | `PostForm.tsx:303-315`; `pinLocation` absent |
| 6 | PostForm submit blocked with `post.locationRequiredError` when `!locationConfirmed` (D-39) | ✓ VERIFIED | `PostForm.tsx:115-117` |
| 7 | Post context hides radius UI via `showRadiusControls={context !== 'post'}` (D-32) | ✓ VERIFIED | `SelectLocationClient.tsx:229`; `SelectLocationMapPane.tsx:331` gates chips/overlay |
| 8 | Browse confirm calls `applyMapFilterPrefs` + `router.back()` (D-33/D-35) | ✓ VERIFIED | `SelectLocationClient.tsx:182-190` |
| 9 | Post confirm calls `writePostDraft` + `router.push('/post')` without `applyMapFilterPrefs` (D-34/D-36) | ✓ VERIFIED | `SelectLocationClient.tsx:173-179`; no `applyMapFilterPrefs` in post branch |
| 10 | Live city preview with `aria-live="polite"`; null text until `ready` (D-14/D-15/D-20/D-21) | ✓ VERIFIED | `SelectLocationClient.tsx:255-269` |
| 11 | Confirm button `disabled={!ready}` in both contexts (D-21) | ✓ VERIFIED | `SelectLocationClient.tsx:275` |
| 12 | Stitch flat-card confirm panel — `rounded-lg border-outline-variant`, no `shadow-[0_4px_24px` (D-40) | ✓ VERIFIED | `SelectLocationClient.tsx:252`; grep: no heavy confirm-panel shadow in map components |
| 13 | Radius chip bar solid `bg-surface-container-lowest`, `font-normal` labels (D-43) | ✓ VERIFIED | `SelectLocationMapPane.tsx:334,350` |
| 14 | Locate-me FAB border-only styling (D-44) | ✓ VERIFIED | `SelectLocationMapPane.tsx:369` — `border border-outline-variant/40 bg-surface-container-lowest` |
| 15 | AppChrome full-viewport hide on `/select-location` pathname only (D-46) | ✓ VERIFIED | `AppChrome.tsx:18,23` — no context query branching |
| 16 | FeedHeaderRow browse entry unchanged — `href="/select-location"` (D-04) | ✓ VERIFIED | `FeedHeaderRow.tsx:133` |
| 17 | `SelectLocationRedPin` zero Phase 13 diff (D-24) | ✓ VERIFIED | `git diff c339455 -- SelectLocationRedPin.tsx` → 0 bytes |
| 18 | `SelectLocationPinOverlay` uses `map.project()` + move/zoom/resize listeners (D-23) | ✓ VERIFIED | `SelectLocationMapPane.tsx:85-96` |
| 19 | Back without Confirm — no storage writes in mount effects or PostForm (D-38) | ✓ VERIFIED | `writePostDraft`/`applyMapFilterPrefs` only in `handleConfirm`; PostForm imports `readPostDraft` only |
| 20 | Server zone derivation via `tagZone` only; no `zone-from-coords.ts` (D-11) | ✓ VERIFIED | `app/api/ugc/listings/route.ts:38`; file absent |
| 21 | Tap-to-place — map click moves pin via `handleMapClick` (D-22) | ✓ VERIFIED | `SelectLocationMapPane.tsx:272`; `SelectLocationClient.tsx:138-143` |
| 22 | Four new i18n keys in zh/en/it (I18N-01 partial) | ✓ VERIFIED | `messages/{en,zh,it}.ts` — `postTitle`, `confirmPickup`, `locationRowPending`, `locationRequiredError`; `key-parity.test.ts` 3/3 pass |
| 23 | Reuses MapLibre + existing pin components (ROADMAP SC3) | ✓ VERIFIED | `SelectLocationMapPane`, `SelectLocationRedPin`, `SelectLocationPinOverlay` unchanged except `showRadiusControls` |
| 24 | `13-VALIDATION.md` nyquist_compliant true after Plan 05 gap closure | ✓ VERIFIED | Frontmatter `nyquist_compliant: true` |

**Score:** 20/20 core must-haves verified at code/automation level (4 runtime behaviors deferred to human UAT)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | ----------- | ------ | ------- |
| `lib/geo/resolve-city-label.ts` | Shared city label resolver | ✓ VERIFIED | Exports `VENICE_CENTER`, `resolveCityLabel` |
| `lib/geo/resolve-city-label.test.ts` | Unit coverage | ✓ VERIFIED | 4 tests pass |
| `lib/post-draft/storage.ts` | sessionStorage CRUD | ✓ VERIFIED | `POST_DRAFT_STORAGE_KEY = shoumanwu_post_draft` |
| `lib/post-draft/storage.test.ts` | Draft validation tests | ✓ VERIFIED | 8 tests pass |
| `components/map/SelectLocationClient.tsx` | Context branching + confirm fork | ✓ VERIFIED | browse/post titles, confirm copy, handlers |
| `components/map/SelectLocationMapPane.tsx` | Conditional radius UI | ✓ VERIFIED | `showRadiusControls` prop |
| `components/ugc/PostForm.tsx` | Location row + submit gate | ✓ VERIFIED | No GPS toggle; draft hydration |
| `app/select-location/page.tsx` | Route entry | ✓ VERIFIED | Renders `SelectLocationPageClient` |
| `.planning/phases/13-select-location-flow/13-VALIDATION.md` | Nyquist validation contract | ✓ VERIFIED | Integration audit + requirements traceability |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `SelectLocationClient` | `resolve-city-label.ts` | import + preview/confirm label | ✓ WIRED | Lines 17, 169-171, 265-268 |
| `SelectLocationClient` | `post-draft/storage.ts` | `readPostDraft` bootstrap / `writePostDraft` confirm | ✓ WIRED | Lines 18, 101, 174-178 |
| `SelectLocationClient` | `mode-transitions.ts` | `applyMapFilterPrefs` browse confirm only | ✓ WIRED | Lines 11, 182-189 |
| `PostForm` | `post-draft/storage.ts` | `readPostDraft` mount hydration | ✓ WIRED | Lines 11, 76-82 |
| `PostForm` | `/select-location?context=post` | location row navigation | ✓ WIRED | Line 305 |
| `FeedHeaderRow` | `/select-location` | browse entry pin link | ✓ WIRED | Line 133 |

### Data-Flow Trace

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| PostForm location row | `locationConfirmed`, `cityLabel` | `readPostDraft()` on mount | Yes — sessionStorage round trip | ✓ FLOWING |
| Post confirm | `shoumanwu_post_draft` | `writePostDraft({ lat, lng, label })` | Yes — JSON with `locationConfirmed: true` | ✓ FLOWING |
| Browse confirm | filter prefs + browse center | `applyMapFilterPrefs(center, radiusKm)` | Yes — existing Phase 10 path | ✓ FLOWING |
| Preview row | city label string | `resolveCityLabel(lat, lng, i18n labels)` | Yes — Venice/Padova from coords | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Phase 13 scoped tests | `npx vitest run lib/geo/resolve-city-label.test.ts lib/post-draft/storage.test.ts messages/key-parity.test.ts` | 3 files, 15 tests passed | ✓ PASS |
| Full lib suite (post gap closure) | `npm run test:lib` | 49 files, 287 tests passed | ✓ PASS |
| Production build | `npm run build` (with `.env.local` Supabase vars) | Compiled + TypeScript green; static pages generated | ✓ PASS |
| D-46 pathname gate | `grep "pathname === '/select-location'" AppChrome.tsx` | match line 18 | ✓ PASS |
| D-04 browse entry | `grep '/select-location' FeedHeaderRow.tsx` | href line 133 | ✓ PASS |
| D-24 RedPin untouched | `git diff c339455 -- SelectLocationRedPin.tsx \| wc -c` | 0 | ✓ PASS |
| D-38 no mount writes | `grep writePostDraft PostForm.tsx` | no matches | ✓ PASS |
| Anti-pattern — no pinLocation | `grep pinLocation PostForm.tsx` | no matches | ✓ PASS |
| Anti-pattern — no selectedLocationLabel | `grep selectedLocationLabel components/map/` | no matches | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no probe scripts declared for Phase 13. Existing `scripts/verify-select-location-dev.mjs` targets Phase 9 zone-chip UX (removed Phase 10) and is not a Phase 13 regression guard.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| LOC-01 | 13-01, 13-02, 13-03 | Full-screen map picker with pin, FAB, preview, Confirm | ✓ SATISFIED | SelectLocationClient + MapPane; live preview + aria-live |
| LOC-02 | 13-01, 13-02 | Confirm persists lat/lng + label for filter or post context | ✓ SATISFIED | applyMapFilterPrefs (browse) + writePostDraft (post) |
| LOC-03 | 13-02 | Browse vs post entry paths | ✓ SATISFIED | FeedHeaderRow browse; PostForm `?context=post` |
| I18N-01 (partial) | 13-02 | Four new location-flow strings in zh/en/it | ✓ SATISFIED | key-parity.test.ts + message files |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| — | — | No TBD/FIXME/PLACEHOLDER in Phase 13 map/post-draft files | — | None |

### Human Verification Required

#### 1. Live pin-move preview (D-14/D-22)

**Test:** Open `/select-location`; tap map or use locate-me FAB.  
**Expected:** Preview row shows Venice or Padova matching pin; red pin drop animation.  
**Why human:** Code wires `resolveCityLabel` on `markerPosition`; map interaction timing requires browser.

#### 2. Confirm disabled until ready (D-21)

**Test:** Hard-refresh `/select-location`; observe Confirm before map ready.  
**Expected:** Button disabled; enables after bootstrap completes.  
**Why human:** `disabled={!ready}` is static; load-state UX needs runtime check.

#### 3. Post-context round trip (LOC-02)

**Test:** `/post` → location row → confirm on map → return.  
**Expected:** City label on row; submit allowed; browse prefs untouched.  
**Why human:** sessionStorage isolation across routes requires browser inspection.

#### 4. Stitch flat-card visual (D-40/D-43/D-44)

**Test:** Visual inspect browse-context floating controls.  
**Expected:** Flat bordered confirm panel; solid radius chips; border-only locate FAB.  
**Why human:** Grep confirms anti-patterns removed; pixel-level Stitch check needs eyes.

### Open Item: D-12 PostForm Field Loss

**Status:** OPEN — developer decision required.  
Navigating between `/post` and `/select-location?context=post` resets photo/title/description/category/condition because App Router fully remounts the PostForm tree. Phase 13 scope intentionally limited session draft to location fields only. Documented in `13-VALIDATION.md` Open Items; not a blocker for LOC-01–03 goal achievement at the code level.

### Gap Closure Note (Plan 13-05)

Initial verification on clean checkout found missing infrastructure files (`messages/subito-category-labels.ts`, `scripts/copy-maplibre-worker.mjs`, map helpers) and pre-existing admin debt blocking `npm run test:lib` / `npm run build`. Cherry-picked gap-closure commit `9d7dfae` (Plan 05) restores green gates: **287/287 lib tests**, **build exit 0** with Supabase env vars. Phase 13 feature code unchanged by gap closure except `13-VALIDATION.md` nyquist flag.

### Gaps Summary

No gaps blocking phase goal achievement at the automated verification level. ROADMAP success criteria (Stitch patterns, confirm persistence, MapLibre reuse) are satisfied in code and unit tests. Four runtime UX checks and one open D-12 developer decision remain for human sign-off.

---

_Verified: 2026-08-10T21:51:00Z_  
_Verifier: Claude (gsd-verifier)_
