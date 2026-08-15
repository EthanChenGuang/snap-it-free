---
slug: source-card-run-stats
date: 2026-08-12
---

# Plan: Source Card Run Stats Micro Panel

Add macOS-style metadata panel above Run Now on source cards: recent run status + last full crawl success with listing count.

## Tasks

1. **types + queries** — `lastFullSuccess` on `SourceWithLastRun`; query full success runs
2. **SourceCard** — `SourceRunStatsPanel` with status indicator + count badge
3. **admin-messages + globals.css** — labels and `sources-stats-*` styles
