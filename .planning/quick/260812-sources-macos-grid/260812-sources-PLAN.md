# Quick: Sources macOS Grid Cards

Refactor `/admin/sources` from table to macOS grid card layout.

## Tasks
1. Rewrite `SourceCard` — header/body/footer grid card spec
2. Rewrite `SourcesListClient` — responsive grid, inline banner, header refresh
3. Add `RunNowButton` `macos` variant (black play button)
4. CSS utilities in `globals.css`

## Acceptance
- grid-cols-1 md:2 lg:3, no table
- iOS toggle, shield badge, footer run + settings
- Amber inline banner for global pause
- Refresh button in header (no bottom link)
