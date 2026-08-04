---
quick_id: 260804-h4c
status: complete
completed: "2026-08-04"
---

# Quick 260804-h4c: Dark/light theme via next-themes

Connected Settings appearance preference (`system` / `light` / `dark`) to live UI theming.

## Changes

- Added `next-themes` with `AppThemeProvider` — reads `shoumanwu_app_preferences.appearance` via `useSyncExternalStore` and applies `forcedTheme` on `<html class="dark">`
- Added `lib/settings/resolve-appearance.ts` + unit tests for theme resolution and FOUC-blocking inline script
- Extended `app/globals.css` with Stitch-aligned dark token overrides under `.dark`
- Wired provider + blocking script in `app/layout.tsx`

## Verification

- `npm run lint` — pass
- `npm test -- lib/settings/resolve-appearance.test.ts` — 5/5 pass
- Manual: Settings → Aspetto cycles system/light/dark and toggles page colors
