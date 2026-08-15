---
slug: translation-queue-error-badge
status: complete
date: 2026-08-12
---

# Summary: Translation Queue Inline Error Badge + Tooltip

Replaced the full-width yellow error chip with an inline compact red badge beside status and attempt count. Full error text appears in a macOS-style dark blurred tooltip on hover/focus.

## Changed

- `components/admin/TranslationQueueClient.tsx` — inline badge in status row
- `components/admin/admin-messages.ts` — `errorBadgeLabel()`
- `app/globals.css` — badge + tooltip styles; removed yellow chip
