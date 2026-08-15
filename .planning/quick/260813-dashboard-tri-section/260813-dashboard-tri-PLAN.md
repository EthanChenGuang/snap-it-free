# Quick: Tri-section dashboard layout with deduplication

Refactor /admin overview into macOS tri-section modular layout; remove duplicate Supabase/cleanup cards.

## Plan

1. Section 1: CoreHealthSection — 2×2 control tiles (global, translation, maintenance) + alerts panel
2. Section 2: PlatformUsageGrid in gray infra shell with SectionHeader (5 platform cards, single Supabase source)
3. Section 3: Data sources grid with SectionHeader
4. Remove QuotaUsageMetric/Panel and duplicate 4-col metrics + bottom service panels from DashboardClient
