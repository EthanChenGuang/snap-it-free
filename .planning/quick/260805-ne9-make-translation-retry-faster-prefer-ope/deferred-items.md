# Deferred Items — Quick Task 260805-ne9

Out-of-scope pre-existing failures discovered while running `npm run lint` (`tsc --noEmit`)
during verification. None of these are in files touched by this task
(`lib/admin/translate.ts`, `lib/admin/translate.test.ts`) and none reference `translate`.
Confirmed pre-existing via `git diff --name-only` (no diff) against the affected files below.
Not fixed here per the Scope Boundary rule — only issues directly caused by this task's
changes are auto-fixed.

- `lib/i18n/listing-fields.test.ts:40,47,52,59,66` — `ListingFieldRow` missing required
  `title` property in several test fixtures (TS2345).
- `scraper-admin/src/components/Sidebar.tsx:155` — call site passes 2 arguments, function
  expects 1 (TS2554).
- `scraper-admin/src/main.tsx:3` — import path ends with `.tsx` extension without
  `allowImportingTsExtensions` enabled (TS5097).
- `scraper-admin/vite.config.ts:6` — excessive type-instantiation stack depth comparing
  Vite config function types against `UserConfigExport` (TS2321/TS2769).
