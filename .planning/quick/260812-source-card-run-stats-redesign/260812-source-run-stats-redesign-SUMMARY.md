---
slug: source-card-run-stats-redesign
status: complete
date: 2026-08-12
---

# Summary: Source Card Run Stats Panel Redesign

Restructured the footer stats panel with clearer hierarchy: bold latest-run header + pill status (✓/✕), truncated failure reason with tooltip, and a divided full-success row with listings count badge.

## Changed

- `components/admin/SourceCard.tsx`
- `components/admin/admin-messages.ts`
- `app/globals.css`
