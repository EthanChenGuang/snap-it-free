---
phase: 11
slug: grid-listing-cards
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-10
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:lib -- lib/listings/card-metadata.test.ts -x` |
| **Full suite command** | `npm run test:lib` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:lib -- lib/listings/card-metadata.test.ts -x`
- **After every plan wave:** Run `npm run test:lib`
- **Before `/gsd-verify-work`:** Full lib suite green + manual grid/favorites visual check
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 0 | CARD-01/02 | — | Metadata builder unit tests | unit | `npm run test:lib -- lib/listings/card-metadata.test.ts -x` | ✅ | ✅ green |
| 11-02-01 | 02 | 1 | CARD-01–05 | — | Tracer card polish E2E | manual | Human verify at `/` grid | — | ⬜ pending |
| 11-03-01 | 03 | 2 | CARD-04/D-11 | — | Single heart on favorites | grep | `rg 'FavoriteButton' components/listings/FavoritesPageClient.tsx` expects 0 | ❌ W0 | ⬜ pending |
| 11-03-02 | 03 | 2 | CARD-02/D-23 | — | Favorites distance wiring | manual | Human verify `/favorites` with center active | — | ⬜ pending |
| 11-04-01 | 04 | 3 | I18N-01 | — | Key parity zh/en/it | unit | `npx vitest run messages/key-parity.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `lib/listings/card-metadata.ts` — extract from `ListListingCard.tsx`
- [x] `lib/listings/card-metadata.test.ts` — covers CARD-01, CARD-02, D-17, D-19 edge cases
- [x] `vitest.config.ts` — already includes `lib/**/*.test.ts`; no config change needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| FREE badge overlay on grid | CARD-03 | Visual styling | Open `/`, confirm emerald FREE pill top-left on cards |
| Glass heart + orange favorited | CARD-04 | Visual + auth gate | Toggle favorite logged in/out; confirm single heart |
| No Claim CTA on grid | CARD-05 | Layout | Confirm no Claim button on grid cards; detail page unchanged |
| Claimed dimming + Reserved suffix | D-17/D-21 | Visual | Find claimed listing; photo dimmed, metadata shows Reserved |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** Wave 0 complete (Plan 01)
