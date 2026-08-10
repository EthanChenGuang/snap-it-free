---
status: complete
quick_id: 260811-2hj
---

# Summary: Settings Page iOS Inset Grouped Redesign

## Completed

- Added iOS-style shared primitives (`SettingsGroupCard`, `SettingsRowCard`, `SettingsAccountCard`, `SettingsChevron`, `SettingsRowDivider`) with native toggle sizing
- Extracted `AccountHeaderSection` (avatar + full email, no logout/chevron) and `LogoutSection` (bottom red sign-out button)
- Refactored General (separate row cards with chevrons), Notifications (single grouped card with dividers), Zones (empty state + header), Language, Account, Advanced sections
- Applied `#F2F2F7` page background and `pb-28` bottom padding on settings page

## Verification

- `npm run build` — passed
