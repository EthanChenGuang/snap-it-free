# Quick: Runs macOS Master-Detail Refactor

Refactor `/admin/runs` from crowded table to macOS/Xcode-style master-detail layout.

## Tasks
1. API route `GET /api/admin/runs/[id]` for detail panel fetch
2. `RunDetailPanel` — metrics cards, status/reason, log with copy
3. Rewrite `RunsListClient` — 400px master list + detail shell, toolbar
4. Update `page.tsx` (searchParams id/days), redirect `[id]` route
5. macOS CSS utilities in `globals.css`

## Acceptance
- Left panel card list with selection state (no detail button)
- Right panel shows metrics + log on selection
- Segmented filter: 全部 | 仅失败 | 已跳过
- Compact dropdowns for source/mode/trigger/time
