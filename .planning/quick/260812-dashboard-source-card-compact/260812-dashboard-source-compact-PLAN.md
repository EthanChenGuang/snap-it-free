# Quick: Simplify overview page data source cards

Overview (概览) dashboard shows full SourceCard with frequency, anti-block, status messages, and nested run stats panel — too detailed for a summary view.

## Plan

1. Add `variant="compact" | "full"` to `SourceCard` (default full)
2. Compact keeps: name, status badge, toggle, last-run status + timestamp, run/settings actions
3. Compact removes: interval, anti-block rows, helper text, SourceRunStatsPanel
4. Pass `variant="compact"` from `DashboardClient` only; sources list page unchanged
5. Add `.sources-grid-card-compact` CSS (reduced padding, no min-height)
