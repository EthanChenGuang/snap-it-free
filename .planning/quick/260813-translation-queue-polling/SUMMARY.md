---
status: complete
---

# Summary

Implemented translation queue real-time polling and multi-node count sync.

## Changes

- `app/api/admin/translation/pending-count/route.ts` — lightweight pending count endpoint
- `hooks/useTranslationQueuePolling.ts` — 2s polling engine with start/stop callbacks
- `components/admin/TranslationQueuePollingProvider.tsx` — React context for AdminShell + page
- `components/admin/AnimatedCount.tsx` — tabular mono numbers with transition-all duration-300
- `AdminShell.tsx` — sidebar + navbar badges read live `pendingCount` from context
- `TranslationQueueClient.tsx` — retry-all triggers polling; button shows 批量处理中… + spinner
- `admin-messages.ts` — new processing/complete copy

Polling stops when `pendingCount === 0` or fetch/POST fails; success toast on full completion.
