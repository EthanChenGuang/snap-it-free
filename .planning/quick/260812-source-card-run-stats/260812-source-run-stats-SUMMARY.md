---
slug: source-card-run-stats
status: complete
date: 2026-08-12
---

# Summary: Source Card Run Stats Micro Panel

Replaced the plain "上次运行" footer line with a two-row micro stats container showing recent run timestamp + status badge, and last full crawl success time + listings count.

## Changed

- `lib/admin/types.ts`, `lib/admin/queries.ts` — `lastFullSuccess` field
- `components/admin/SourceCard.tsx` — `SourceRunStatsPanel`, `RunStatusIndicator`
- `components/admin/admin-messages.ts` — run stats copy
- `app/globals.css` — `sources-stats-*`, `sources-run-status-*`
