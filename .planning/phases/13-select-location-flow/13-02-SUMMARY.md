---
phase: 13-select-location-flow
plan: 02
subsystem: ui
tags: [select-location, post-form, sessionStorage, context-branching, maplibre]

requires:
  - phase: 13-select-location-flow
    provides: lib/geo/resolve-city-label and lib/post-draft/storage from Plan 01
provides:
  - Context-aware SelectLocationClient (browse vs post via ?context=post)
  - Conditional radius UI in SelectLocationMapPane (showRadiusControls)
  - PostForm tappable pickup row with draft hydration and submit gate
affects:
  - 13-select-location-flow Plan 03 (browse-side polish on same branch point)

tech-stack:
  added: []
  patterns:
    - Query-param context dispatch (D-01) without lat/lng in URL
    - Post confirm writes shoumanwu_post_draft then router.push('/post')
    - Browse confirm unchanged (applyMapFilterPrefs + router.back)

key-files:
  created: []
  modified:
    - components/map/SelectLocationClient.tsx
    - components/map/SelectLocationMapPane.tsx
    - components/ugc/PostForm.tsx
    - messages/en.ts
    - messages/zh.ts
    - messages/it.ts

key-decisions:
  - "Post context uses flyTo at DEFAULT_ZOOM instead of fitMapToRadius — invisible radius would mislead pin placement (D-26)"
  - "Form title/photo/description reset on navigate-out-and-back is accepted UX debt per D-12 — follow-up phase candidate"

patterns-established:
  - "showRadiusControls prop gates radius Source/Layer, chip bar, and radar animation"
  - "PostForm location row navigates to /select-location?context=post; coords travel only via sessionStorage"

requirements-completed: [LOC-01, LOC-02, LOC-03, I18N-01]

coverage:
  - id: D1
    description: "Map picker branches on context=post with independent confirm path and hidden radius UI"
    requirement: LOC-01
    verification:
      - kind: unit
        ref: "messages/key-parity.test.ts"
        status: pass
      - kind: other
        ref: "grep acceptance criteria (useSearchParams, writePostDraft, showRadiusControls)"
        status: pass
    human_judgment: true
    rationale: "Full post-context round trip (sessionStorage write, browse prefs untouched) requires manual browser verification"
  - id: D2
    description: "PostForm tappable location row, draft hydration, submit blocked until locationConfirmed"
    requirement: LOC-02
    verification:
      - kind: unit
        ref: "messages/key-parity.test.ts"
        status: pass
      - kind: other
        ref: "grep acceptance criteria (readPostDraft, locationRequiredError, no pinLocation)"
        status: pass
    human_judgment: true
    rationale: "End-to-end PostForm → picker → confirm → submit gate needs manual UAT"
  - id: D3
    description: "Four new i18n keys (postTitle, confirmPickup, locationRowPending, locationRequiredError) in zh/en/it"
    requirement: I18N-01
    verification:
      - kind: unit
        ref: "messages/key-parity.test.ts"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-08-10
status: complete
---

# Phase 13 Plan 02: Post Pickup Location Tracer Summary

**End-to-end post pickup flow: context-branching map picker, session draft persist, PostForm row + submit gate**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-10T21:11:12Z
- **Completed:** 2026-08-10T21:13:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- SelectLocationClient derives `browse` vs `post` from `?context=post`; post confirm calls `writePostDraft` and navigates to `/post` without touching browse filter prefs
- SelectLocationMapPane accepts `showRadiusControls` — radius polygons, radar animation, and chip bar hidden in post context; pin overlay and locate-me FAB remain
- PostForm replaces inline GPS toggle with tappable row → `/select-location?context=post`; hydrates from `readPostDraft()` on mount; blocks submit until `locationConfirmed`
- Added i18n keys: `selectLocation.postTitle`, `selectLocation.confirmPickup`, `post.locationRowPending`, `post.locationRequiredError` (zh/en/it)

## Task Commits

Each task was committed atomically:

1. **Task 1: Context branching in SelectLocationClient + SelectLocationMapPane** - `47010a8` (feat)
2. **Task 2: PostForm location row, draft hydration, submit validation** - `b8b4933` (feat)

## Files Created/Modified

- `components/map/SelectLocationClient.tsx` — context dispatch, post/browse confirm fork, post bootstrap from draft
- `components/map/SelectLocationMapPane.tsx` — `showRadiusControls` prop gates radius UI and radar
- `components/ugc/PostForm.tsx` — location row navigation, draft hydration, submit gate
- `messages/{en,zh,it}.ts` — four new location-flow strings

## Decisions Made

- Post context camera uses `flyTo` at fixed zoom instead of radius fit — avoids misleading zoom when radius overlay is hidden
- D-12 acknowledged: non-location form fields (photo, title, etc.) reset after navigate-out-and-back; documented for developer follow-up

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run build` fails on pre-existing TypeScript error in `lib/admin/cleanup.ts` (unrelated admin debt). Phase-scoped verification (`messages/key-parity.test.ts`) passes; build failure logged as deferred, not introduced by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 can polish browse-side select-location on the same context branch point
- Manual UAT recommended: full post pickup round trip and confirm browse prefs unchanged after post flow

## Self-Check: PASSED

- FOUND: components/map/SelectLocationClient.tsx
- FOUND: components/ugc/PostForm.tsx
- FOUND: 47010a8
- FOUND: b8b4933

---
*Phase: 13-select-location-flow*
*Completed: 2026-08-10*
