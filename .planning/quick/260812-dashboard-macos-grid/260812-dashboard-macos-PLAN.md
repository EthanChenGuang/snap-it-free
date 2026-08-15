# Quick: macOS Dashboard Grid for Overview page

Refactor admin overview (抓取管理) into Apple Dashboard Grid command center layout.

## Plan

1. Top 4-col metric cards: global status, translation queue, Supabase quota, DB maintenance
2. Middle: data sources grid (compact SourceCard + platform icons)
3. Bottom 2-col: service panels (left) + alerts center (right)
4. Extract useQuotaUsage / useMaintenance hooks for shared state between metric + panel
5. Add dashboard-console CSS (SF Pro, mono timestamps, hover shadows)
