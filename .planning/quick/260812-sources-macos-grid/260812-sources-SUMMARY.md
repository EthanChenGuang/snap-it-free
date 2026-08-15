---
status: complete
slug: sources-macos-grid
date: 2026-08-12
---

# Summary: Sources macOS Grid Cards

Replaced the crowded sources table with a responsive macOS-style grid card layout.

## Delivered
- **Grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- **SourceCard:** white rounded-xl cards with title+badge+toggle, interval/shield body, footer last-run + run/settings
- **Banner:** amber inline global-pause banner
- **Toolbar:** compact refresh button with rotate icon in page header
- **RunNowButton:** new `macos` variant (black rounded, play icon)

## Files
- `components/admin/SourcesListClient.tsx`
- `components/admin/SourceCard.tsx`
- `components/admin/RunNowButton.tsx`
- `components/admin/admin-messages.ts`
- `app/globals.css`
