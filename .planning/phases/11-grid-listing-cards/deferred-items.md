# Phase 11 — Deferred Items (out of scope)

Discovered during Plan 04 phase gate; not introduced by grid-listing-cards work.

| Item | File | Description | Discovered |
|------|------|-------------|------------|
| subito-regalo-catalog tests | `lib/admin/subito-regalo-catalog.test.ts` | 3 failures: PADOVA_SPIKE_PASS vs spike artifact mismatch | Plan 04 task 3 |
| build typecheck | `lib/admin/cleanup.ts:34` | PostgrestQueryBuilder cast type error blocks `npm run build` | Plan 04 task 3 |

Phase 11 scoped tests (`card-metadata`, `key-parity`) pass when run directly.
