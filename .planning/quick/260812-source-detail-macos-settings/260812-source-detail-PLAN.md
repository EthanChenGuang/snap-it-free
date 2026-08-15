---
slug: source-detail-macos-settings
date: 2026-08-12
---

# Plan: Source Detail macOS System Settings Layout

Refactor Subito source detail page from single-column form to macOS System Settings two-column layout.

## Tasks

1. **RegaloUrlMatrix** — Chip selectors for cities/categories; inline banners; card shell
2. **TargetUrlEditor** — Code-editor style URL list with line numbers, count badge, copy/clear
3. **SourceDetailClient** — `lg:grid-cols-12` split: left matrix+editor, right toggle/stepper/presets/thresholds/save
4. **globals.css** — `source-detail-*` styles aligned with sources/runs macOS admin aesthetic

## Success

- Left column holds matrix + URL editor; right column holds controls + sticky save panel
- Save/PATCH logic unchanged; typecheck passes
