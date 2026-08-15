---
status: complete
slug: source-detail-chip-url-editor-fix
date: 2026-08-12
---

# Summary: Fix Chip Selected State & URL Editor Blank Lines

Polished Subito config page chip aesthetics and URL editor layout.

## Delivered

- **Chips:** macOS blue accent selected state (`bg-blue-50 text-blue-600 border-blue-200/80`) with ✓ icon; gray unselected with hover
- **URL editor:** Fixed `320px` shell height, scroll-only overflow; removed `rows={Math.max(..., 8)}`; line numbers strip trailing empty lines and match actual content

## Files

- `components/admin/RegaloUrlMatrix.tsx`
- `components/admin/TargetUrlEditor.tsx`
- `app/globals.css`
