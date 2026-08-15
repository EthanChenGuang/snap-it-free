---
status: complete
slug: source-detail-macos-settings
date: 2026-08-12
---

# Summary: Source Detail macOS System Settings Layout

Refactored Subito source configuration page to macOS System Settings two-column layout.

## Delivered

- **Layout:** `grid grid-cols-1 lg:grid-cols-12 gap-6` — left `col-span-8` (matrix + editor), right `col-span-4` (controls + save)
- **RegaloUrlMatrix:** macOS chip selectors for cities/categories; 全选/清空 text actions; soft inline warning/info banners
- **TargetUrlEditor:** SF Mono code-editor shell with line numbers, URL count badge, copy/clear icon buttons
- **Sidebar:** iOS toggle, interval stepper, vertical anti-block preset cards with check icon, read-only threshold tags, sticky save panel (ghost cancel + black primary)

## Files

- `components/admin/SourceDetailClient.tsx`
- `components/admin/RegaloUrlMatrix.tsx`
- `components/admin/TargetUrlEditor.tsx` (new)
- `app/globals.css`
