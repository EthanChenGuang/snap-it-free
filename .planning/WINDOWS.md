---
schema_version: 1
open_count: 10
waived_count: 0
fixed_count: 0
total_count: 10
last_updated: 2026-08-10T16:29:14.843Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 02 | stub | components/detail/DetailTopBar.tsx | 65 | Favorite toggle disabled until Plan 04 localStorage favorites | open |  | 2026-07-28T14:06:20.356Z |  |
| 2 | 03 | stub | components/detail/UgcListingShell.tsx |  | Contatta button disabled stub until Plan 02 DM (D-71) | open |  | 2026-08-01T09:03:12.216Z |  |
| 3 | 04 | stub | messages/it.ts |  | Map Crea avviso CTA string only — map wiring deferred (D-117 optional) | open |  | 2026-08-01T14:31:47.738Z |  |
| 4 | 04 | unrun-verify | app/api/alerts/matches/route.ts |  | npx next build blocked by pre-existing maplibre-gl Turbopack error | open |  | 2026-08-01T14:35:17.427Z |  |
| 5 | 06 | stub | app/admin/page.tsx | 8 | Auth gate TODO — Plan 03 middleware (D-48) | open |  | 2026-08-04T18:39:30.035Z |  |
| 6 | 08 | deviation | .planning/phases/08-subito-regalo-url-matrix-venice-padova-veneto-all-categories/08-PADOVA-SPIKE.md |  | Padova spike coord gate FAIL — 0/2 detail pages with embed coords | open |  | 2026-08-05T17:47:25.725Z |  |
| 7 | 10 | stub | components/listings/FilterSheet.tsx |  | Radius section shows placeholder text only | open |  | 2026-08-10T13:06:43.226Z |  |
| 8 | 10 | stub | components/listings/ListListingCard.tsx |  | distanceMeters prop accepted but not rendered in metadata | open |  | 2026-08-10T13:10:26.025Z |  |
| 9 | 11 | unrun-verify | lib/admin/subito-regalo-catalog.test.ts |  | 3 pre-existing failures block npm run test:lib full suite exit 0 | open |  | 2026-08-10T16:29:14.686Z |  |
| 10 | 11 | unrun-verify | lib/admin/cleanup.ts | 34 | Pre-existing TS error blocks npm run build exit 0 | open |  | 2026-08-10T16:29:14.843Z |  |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "02",
    "file": "components/detail/DetailTopBar.tsx",
    "line": 65,
    "description": "Favorite toggle disabled until Plan 04 localStorage favorites",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-07-28T14:06:20.356Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "stub",
    "phase": "03",
    "file": "components/detail/UgcListingShell.tsx",
    "line": null,
    "description": "Contatta button disabled stub until Plan 02 DM (D-71)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-01T09:03:12.216Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "stub",
    "phase": "04",
    "file": "messages/it.ts",
    "line": null,
    "description": "Map Crea avviso CTA string only — map wiring deferred (D-117 optional)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-01T14:31:47.738Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "04",
    "file": "app/api/alerts/matches/route.ts",
    "line": null,
    "description": "npx next build blocked by pre-existing maplibre-gl Turbopack error",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-01T14:35:17.427Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "stub",
    "phase": "06",
    "file": "app/admin/page.tsx",
    "line": 8,
    "description": "Auth gate TODO — Plan 03 middleware (D-48)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-04T18:39:30.035Z",
    "resolved_at": null
  },
  {
    "id": 6,
    "kind": "deviation",
    "phase": "08",
    "file": ".planning/phases/08-subito-regalo-url-matrix-venice-padova-veneto-all-categories/08-PADOVA-SPIKE.md",
    "line": null,
    "description": "Padova spike coord gate FAIL — 0/2 detail pages with embed coords",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-05T17:47:25.725Z",
    "resolved_at": null
  },
  {
    "id": 7,
    "kind": "stub",
    "phase": "10",
    "file": "components/listings/FilterSheet.tsx",
    "line": null,
    "description": "Radius section shows placeholder text only",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-10T13:06:43.226Z",
    "resolved_at": null
  },
  {
    "id": 8,
    "kind": "stub",
    "phase": "10",
    "file": "components/listings/ListListingCard.tsx",
    "line": null,
    "description": "distanceMeters prop accepted but not rendered in metadata",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-10T13:10:26.025Z",
    "resolved_at": null
  },
  {
    "id": 9,
    "kind": "unrun-verify",
    "phase": "11",
    "file": "lib/admin/subito-regalo-catalog.test.ts",
    "line": null,
    "description": "3 pre-existing failures block npm run test:lib full suite exit 0",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-10T16:29:14.686Z",
    "resolved_at": null
  },
  {
    "id": 10,
    "kind": "unrun-verify",
    "phase": "11",
    "file": "lib/admin/cleanup.ts",
    "line": 34,
    "description": "Pre-existing TS error blocks npm run build exit 0",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-10T16:29:14.843Z",
    "resolved_at": null
  }
]
````
