---
status: all_fixed
phase: 02-map-list-core-browsing
fixed_at: 2026-07-28T21:33:00Z
fix_scope: critical_warning
findings_in_scope: 6
fixed: 6
skipped: 0
iteration: 1
---

# Phase 02: Code Review Fix Report

**Scope:** Critical + Warning (6 findings)
**Status:** all_fixed
**Iteration:** 1

## Fixes Applied

| ID | Severity | File | Fix |
|----|----------|------|-----|
| WR-01 | Warning | `components/shell/BottomNav.tsx` | Exact match for `/list`; prefix match only for other routes |
| WR-02 | Warning | `components/listings/FavoritesPageClient.tsx` | `fetchFailed` state + retry UI when localStorage has IDs |
| WR-03 | Warning | `components/detail/ScrapedListingShell.tsx` | Reset `embedBlocked` when `external_url` changes |
| WR-04 | Warning | `lib/listings/queries.ts`, `lib/listings/client-queries.ts` | Return `[]`/`null` on Supabase errors instead of throw |
| WR-05 | Warning | `supabase/migrations/006_listings_public_view.sql` | `listings_public` view; revoke anon SELECT on base table |
| WR-06 | Warning | `components/listings/FavoritesPageClient.tsx` | Zone-filter empty message when saved count > 0 |

## Additional

- Updated `lib/listings/queries.ts` and `client-queries.ts` to query `listings_public`
- Added Italian strings: `favorites.loadError`, `favorites.retry`, `favorites.zoneEmpty`
- Fixed IN-01 collaterally: use `FAVORITES_CHANGE_EVENT` constant in FavoritesPageClient
- Updated `lib/listings/queries.test.ts` for view-based queries

## Verification

- `npm run test:lib` — 18/18 passed

## Remaining (Info — not in fix scope)

- IN-02: Header menu button stub
- IN-03: Unused `pruneFavoriteIds` export
- IN-04: Unused `isVeniceZone` export

---

_Fixed: 2026-07-28T21:33:00Z_
