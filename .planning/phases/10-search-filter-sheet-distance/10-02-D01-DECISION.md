# D-01 Decision Record — Plan 10-02

**Date:** 2026-08-10  
**Decision:** `proceed-city-only`  
**Gate:** blocking checkpoint resolved by user directive

## Selected Option

Proceed with D-01 city-only consumer filter: **All · Venice · Padova** in filter sheet and pills. Retire zone names (Centro / Mestre / Lido) from consumer UI.

## Rationale

- D-01 is LOCKED in `10-CONTEXT.md`
- Supersedes FILT-04 zone-chip UX and Phase 9 D-22
- Data layer retains zone enum (D-02); keyword alerts unchanged (D-03)

## Executor Constraints

- Do NOT reintroduce Centro/Mestre/Lido in consumer feed, pills, cards, or select-location UI
- City filter derives from `listingConsumerCity()` zone mapping per D-34
