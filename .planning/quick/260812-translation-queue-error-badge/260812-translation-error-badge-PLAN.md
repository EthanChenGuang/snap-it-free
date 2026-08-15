---
slug: translation-queue-error-badge
date: 2026-08-12
---

# Plan: Translation Queue Inline Error Badge + Tooltip

Replace heavy yellow error alert box with macOS-style compact inline badge and hover tooltip.

## Tasks

1. **TranslationQueueClient** — Move error into status row; badge + tooltip progressive disclosure
2. **admin-messages** — `errorBadgeLabel()` short labels (Provider 异常 / 翻译失败)
3. **globals.css** — Remove yellow chip; add compact badge + blurred dark tooltip
