---
status: complete
slug: translation-queue-macos-cards
date: 2026-08-12
---

# Summary: Translation Queue macOS Inset Grouped Cards

Refactored translation queue page to macOS inset grouped card list.

## Delivered

- **Header:** Subtitle + pending hint; black primary「重新翻译全部待处理」with rotate icon
- **Batch bar:** Select all, `已选 X 项 / 共 Y 条待翻译`, accent「批量重试」, ghost「清空选中」
- **Cards:** Checkbox + title/ID/source badge; failed status pill; attempts; amber error chip (2-line clamp); per-row retry
- **Split actions:** Header retries all pending; batch bar retries selection only

## Files

- `components/admin/TranslationQueueClient.tsx`
- `components/admin/admin-messages.ts`
- `app/globals.css`
