---
phase: 02-map-list-core-browsing
plan: 03
subsystem: ui
tags: [nextjs, detail-route, subito, webview-shell, stitch, italian, security]

requires:
  - plan: 02-02
    provides: ListingCard, ListingPopup, messages/it.ts, map sheet entry points
provides:
  - shareable /listing/[id] RSC detail route
  - ScrapedListingShell with canonical DB metadata and external CTAs
  - isAllowedExternalUrl subito.it allowlist
  - Web Share API with clipboard fallback
affects:
  - 02-04-PLAN.md

tech-stack:
  added: []
  patterns: [RSC getListingById with expiry predicates, external URL allowlist before render, iframe timeout fallback for X-Frame-Options]

key-files:
  created:
    - app/listing/[id]/page.tsx
    - components/detail/ScrapedListingShell.tsx
    - components/detail/DetailTopBar.tsx
    - components/detail/HeroMetadata.tsx
    - lib/listings/external-url.ts
    - lib/listings/external-url.test.ts
    - lib/listings/share.ts
  modified:
    - lib/listings/queries.ts
    - lib/listings/queries.test.ts
    - components/listings/ListingCard.tsx
    - components/listings/ListingPopup.tsx
    - components/listings/ListingFeed.tsx
    - components/map/MapExplorer.tsx
    - messages/it.ts

key-decisions:
  - "Subito detail is metadata shell + external tab CTAs; iframe is best-effort with 5s timeout fallback"
  - "isAllowedExternalUrl restricts links to https subito.it and www.subito.it only"
  - "Favorite button rendered disabled until Plan 04 localStorage wiring"

requirements-completed: [DISC-04, DISC-05]

coverage:
  - id: D1
    description: "/listing/[uuid] renders canonical DB metadata for active subito listings"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: lib/listings/external-url.test.ts
        status: pass
      - kind: other
        ref: app/listing/[id]/page.tsx
        status: pass
    human_judgment: true
    rationale: "Live Subito photo URLs require device QA"
  - id: D2
    description: "Claim and Apri su Subito open allowlisted external_url in new tab"
    requirement: DISC-05
    verification:
      - kind: other
        ref: components/detail/ScrapedListingShell.tsx
        status: pass
    human_judgment: true
    rationale: "window.open noopener behavior needs browser verification"
  - id: D3
    description: "ListingCard and ListingPopup link to shareable detail URLs"
    requirement: DISC-04
    verification:
      - kind: other
        ref: components/listings/ListingCard.tsx
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-28
status: complete
---

# Phase 2 Plan 03: Scraped Listing Detail Shell Summary

**Shareable `/listing/[id]` route with canonical DB metadata, external Subito claim CTAs, and iframe X-Frame-Options fallback**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-28T14:02:29Z
- **Completed:** 2026-07-28T14:05:46Z
- **Tasks:** 3/3
- **Files modified:** 13

## Accomplishments

- Implemented `getListingById` with same active/expiry/zone predicates as `getActiveListings` (D-40, D-45)
- Added `isAllowedExternalUrl` allowlist mitigating open-redirect on `external_url` (T-02-07)
- Built `/listing/[id]` RSC page with UUID validation and 404 for missing/expired/non-subito rows (D-26)
- Ported two-column Stitch detail layout: HeroMetadata, sidebar Reclama su Subito CTA, DetailTopBar controls (D-43, D-44, D-51)
- Optional iframe with restrictive sandbox and Italian fallback when embed blocked (D-42, RESEARCH Pitfall 1)
- Wired ListingCard and ListingPopup to URL-based detail navigation (D-26)

## Task Commits

1. **Task 1: Listing detail RSC route + external URL allowlist** — `c57851b` (feat)
2. **Task 2: ScrapedListingShell — metadata, CTAs, iframe fallback** — `d2ff4e9` (feat)
3. **Task 3: Wire list and map entry points to detail route** — `704aa67` (feat)

## Decisions Made

- Metadata shell is primary UX; iframe attempts embed but always falls back after timeout because Subito sets X-Frame-Options SAMEORIGIN
- Share uses Web Share API with clipboard fallback and inline status notice (no shadcn toast yet)
- Favorite heart is visible but disabled — wired in Plan 04

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| File | Line | Reason |
|------|------|--------|
| components/detail/DetailTopBar.tsx | 65 | Favorite toggle disabled until Plan 04 localStorage favorites |

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: external_navigation | lib/listings/external-url.ts | User leaves app via allowlisted window.open to subito.it |
| threat_flag: iframe_embed | components/detail/ScrapedListingShell.tsx | Sandboxed iframe attempt without allow-scripts |

## Self-Check: PASSED

- FOUND: app/listing/[id]/page.tsx, components/detail/ScrapedListingShell.tsx, lib/listings/external-url.ts
- FOUND: c57851b, d2ff4e9, 704aa67

---
*Phase: 02-map-list-core-browsing*
*Completed: 2026-07-28*
