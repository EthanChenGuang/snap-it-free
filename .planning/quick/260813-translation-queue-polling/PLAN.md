---
status: complete
completed_at: 2026-08-13
---

# Quick Task: Translation Queue Real-time Polling

Implement real-time pending count polling when "重新翻译全部待处理" is clicked.

## Tasks

1. Add GET `/api/admin/translation/pending-count` API
2. Create `useTranslationQueuePolling` hook + provider for shared state
3. Wire sidebar badge, navbar badge, page header counts with AnimatedCount
4. Start 2s polling on retry-all; stop at zero or error; show completion toast
