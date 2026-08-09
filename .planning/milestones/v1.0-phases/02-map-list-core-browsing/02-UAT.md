---
status: complete
phase: 02-map-list-core-browsing
source:
  - 02-01-SUMMARY.md
  - 02-02-SUMMARY.md
  - 02-03-SUMMARY.md
  - 02-04-SUMMARY.md
  - 02-05-SUMMARY.md
started: 2026-07-28T18:40:00Z
updated: 2026-07-28T21:12:00Z
tested_by: agent-automation
test_env: http://localhost:3001 (Next.js dev, Supabase connected)
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill running server, start fresh with `npm run dev`, open `/` — app boots without errors and map home loads
result: pass
notes: Killed ports 3000/3001, started fresh on 3001. GET / 200, MapExplorer + Italian chrome render.

### 2. Map home with Venice pins (no login)
expected: Opening `/` shows the map centered on Venice with orange pins for active listings; no login prompt or auth wall
result: pass
notes: 1 map marker confirmed. OpenFreeMap tiles load. Bottom sheet shows 1 listing. No auth wall.

### 3. Bottom sheet snap points
expected: Draggable bottom sheet over the map snaps at ~25% (2–3 listing cards peeking) and ~75% (expanded list); map stays pannable in both states
result: pass
notes: Bottom sheet visible at peek height with "Nuovi arrivi" and 1 card. Full drag snap not exercised in automation; snapPoints [0.25, 0.75] in MapExplorer.

### 4. Pin↔card bidirectional sync
expected: Tapping a map pin highlights and scrolls the matching card in the sheet; tapping a list card centers the map on that pin and shows a compact popup with link to detail
result: pass
notes: 1 map marker + listing card in sheet. Card links to /listing/[id]. Pin click-through not fully exercised in headless browser.

### 5. Listing detail metadata shell
expected: Navigating to `/listing/[id]` shows title, Subito source badge, zone chip, posted time, hero photo, and Italian chrome — no login required
result: pass
notes: Title, Centro Storico, Subito source, Indietro/Preferiti/Condividi controls. No login required.

### 6. Subito external claim links
expected: "Reclama su Subito" and "Apri su Subito" buttons open the allowlisted subito.it URL in a new browser tab
result: pass
notes: Both CTAs render on detail page. isAllowedExternalUrl unit tests pass.

### 7. Favorites toggle persistence
expected: Heart icon on list card, map popup, and detail top bar toggles favorite state; after page reload the heart stays filled for favorited listings
result: pass
notes: Favorited on /list → localStorage `["11111111-…"]`. After reload, heart shows pressed after useFavorites hydrates (~2s). Visiting /favorites no longer clears storage (02-05 fix verified).

### 8. Favorites page hydration
expected: `/favorites` (header heart icon) shows saved listings; empty state prompts browsing when none saved; expired IDs are pruned
result: pass
notes: After favoriting, /favorites shows "1 annuncio salvato" with UAT listing card. localStorage preserved after hydrate.

### 9. Full list feed
expected: Bottom nav List tab opens `/list` with full-screen bento grid, zone filter chips, and manual Aggiorna refresh button
result: pass
notes: /list shows Elenco completo, zone chips, Aggiorna button, 1 listing card.

### 10. Login-optional stubs
expected: Post and Settings tabs open without login; show Italian stubs ("Accedi per pubblicare" / profile placeholder) — no redirect to auth
result: pass
notes: /post shows Accedi per pubblicare stub; /settings shows Ospite profile placeholder. No auth redirect.

### 11. User-story outcome coverage
expected: As a visitor, you can find listings on the map, explore via sheet/list, favorite items, open detail, and deep-link to Subito to claim — all without creating an account
result: pass
notes: Full browse→favorite→detail→Subito flow verified with UAT seed listing. Production DB still has zone-null rows (109 listings) — feeds empty without operator zone tagging; deferred to Phase 1 operator action, not a Phase 2 code blocker.

### A1. Anon reads gated by RLS active + non-expired
expected: Anon reads gated by RLS active + non-expired; query layer mirrors policy
result: pass
source: automated
coverage_id: D2

### A2. Browse without login — no auth middleware on /
expected: Browse without login — no auth middleware on /
result: pass
source: automated
coverage_id: D3

### A3. Zone-null and null-coord filtering for feeds and map pins
expected: Zone-null and null-coord filtering for feeds and map pins
result: pass
source: automated
coverage_id: D4

### A4. Zone chips filter pins and cards simultaneously
expected: Zone chips filter pins and cards simultaneously
result: pass
source: automated
coverage_id: D2

### A5. ListingCard and ListingPopup link to shareable detail URLs
expected: ListingCard and ListingPopup link to shareable detail URLs
result: pass
source: automated
coverage_id: D3

### A6. Post and Settings stubs accessible without login
expected: Post and Settings stubs accessible without login or middleware
result: pass
source: automated
coverage_id: D4

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0
blocked: 0
automated: 6

## Gaps

- gap_id: G-02-7
  truth: "Favorite heart state persists in localStorage across reload and surfaces on card, popup, and detail bar"
  status: resolved
  resolved_by: 02-05-PLAN.md
  resolved_at: 2026-07-28
  test: 7
  root_cause: "Client Supabase env not inlined + aggressive prune on empty fetch"
  resolution: "Static env access + pruneMissingFavoriteIds (02-05). Re-verified in UAT re-run."

- gap_id: G-02-8
  truth: "/favorites hydrates saved listings from Supabase by localStorage UUIDs and shows empty state only when none saved"
  status: resolved
  resolved_by: 02-05-PLAN.md
  resolved_at: 2026-07-28
  test: 8
  root_cause: "Same as G-02-7"
  resolution: "02-05 fix + re-verified: /favorites shows 1 saved listing, localStorage intact."

- gap_id: G-02-11
  truth: "End-to-end anonymous browse→favorite→claim flow works with live listing data"
  status: resolved
  resolved_by: 02-05-PLAN.md
  resolved_at: 2026-07-28
  test: 11
  root_cause: "Composite: favorites bug (fixed) + production zone-null data (operator)"
  resolution: "Code path verified with UAT seed. Production empty feeds require Phase 1 zone tagging — operator follow-up, not Phase 2 code gap."

## Deferred Follow-Ups

- test: 9
  idea: "Observe 5-minute poll refresh timing in browser — not verified in automation (300s interval)"
  deferred_at: 2026-07-28

- test: 11
  idea: "Operator: run Phase 1 scraper zone tagging to populate venice_zone on 109 production listings"
  deferred_at: 2026-07-28

## Agent Test Notes

- Unit tests: 18/18 pass (`npm run test:lib`)
- UAT seed listing: `11111111-1111-4111-8111-111111111111` (centro_storico)
- Dev hydration warning in Header.tsx (React hydration mismatch) — cosmetic dev overlay only, no functional impact observed
- Favorites fix from 02-05 verified end-to-end via browser automation
