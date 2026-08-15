---
status: complete
slug: runs-macos-master-detail
date: 2026-08-12
---

# Summary: Runs macOS Master-Detail Refactor

Replaced the single-page runs table with a macOS-style master-detail layout.

## Delivered
- **Master panel (400px):** Inset grouped cards — source, status badge, timestamp, duration; click to select
- **Detail panel:** Key metrics (发现/入库/拒绝/耗时), outcome explanation, monospace log block with copy
- **Toolbar:** Segmented control (全部/仅失败/已跳过) + compact dropdowns (数据源/模式/触发/时间)
- **Routing:** `/admin/runs?id=` deep links; `/admin/runs/[id]` redirects to query form
- **API:** `GET /api/admin/runs/[id]`

## Files
- `components/admin/RunsListClient.tsx` — rewritten
- `components/admin/RunDetailPanel.tsx` — new
- `app/api/admin/runs/[id]/route.ts` — new
- `app/admin/runs/page.tsx`, `[id]/page.tsx` — updated
- `app/globals.css` — runs-master-detail styles
- `components/admin/admin-messages.ts` — `runsMasterDetailMessages`
