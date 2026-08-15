---
status: complete
---

# Summary: Tri-section dashboard with deduplication

Overview page now uses three clear sections with no duplicate Supabase/cleanup cards.

## Changes

- `DashboardClient.tsx` — tri-section layout only
- `CoreHealthSection.tsx` — Section 1 control tiles + alerts
- `DashboardSectionHeader.tsx` — reusable section titles
- `PlatformUsageGrid.tsx` — gray infra shell, uniform platform cards
- `globals.css` — control tiles, infra shell, platform card styles

Removed from dashboard: 4-col metrics row, QuotaUsagePanel, MaintenancePanel duplicates.
