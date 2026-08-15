---
status: complete
---

# Summary: macOS Dashboard Grid overview

Refactored admin overview into Apple Dashboard Grid command center layout.

## Changes

- `DashboardClient.tsx` — 4-col metrics, sources grid, 2-col bottom (services + alerts)
- `QuotaUsageCard.tsx` — `useQuotaUsage`, `QuotaUsageMetric`, `QuotaUsagePanel`
- `MaintenanceCard.tsx` — `useMaintenance`, `MaintenanceMetric`, `MaintenancePanel`
- `SourceCard.tsx` — platform Material icon per source slug
- `admin-messages.ts` — `sourceIcons` map
- `globals.css` — `.dashboard-*` macOS command center styles
