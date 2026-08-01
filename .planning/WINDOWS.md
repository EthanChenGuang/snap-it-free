---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: 2026-08-01T09:03:12.216Z
---

# Broken Windows Ledger

> Cross-phase defect register. `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 02 | stub | components/detail/DetailTopBar.tsx | 65 | Favorite toggle disabled until Plan 04 localStorage favorites | open |  | 2026-07-28T14:06:20.356Z |  |
| 2 | 03 | stub | components/detail/UgcListingShell.tsx |  | Contatta button disabled stub until Plan 02 DM (D-71) | open |  | 2026-08-01T09:03:12.216Z |  |

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
  }
]
````
