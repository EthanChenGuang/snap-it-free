---
status: complete
---

# Summary: Dashboard source card compact variant

Added `variant="compact"` to `SourceCard` and enabled it on the overview dashboard.

## Changes

- `components/admin/SourceCard.tsx` — compact variant with single last-run line
- `components/admin/DashboardClient.tsx` — passes `variant="compact"`, smaller skeleton
- `app/globals.css` — `.sources-grid-card-compact` styles

Sources list page (`/admin/sources`) keeps the full card unchanged.
