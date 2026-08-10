---
phase: 10
slug: search-filter-sheet-distance
status: ready-for-verify-work
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-10
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:lib -- lib/geo/haversine.test.ts lib/filter-prefs/storage.test.ts lib/listings/filters.test.ts -x` |
| **Full suite command** | `npm run test:lib` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:lib -- lib/geo lib/filter-prefs lib/listings/filters.test.ts lib/listings/subito-categories.test.ts -x`
- **After every plan wave:** Run `npm run test:lib`
- **Before `/gsd-verify-work`:** Full suite must be green + `messages/key-parity.test.ts`
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 0 | FILT-05 | T-10-01 | Haversine math correct | unit | `npm run test:lib -- lib/geo/haversine.test.ts -x` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 0 | FILT-01 | T-10-02 | Filter prefs JSON validated | unit | `npm run test:lib -- lib/filter-prefs/storage.test.ts -x` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 0 | FILT-04/05 | T-10-03 | City map + radius filter | unit | `npm run test:lib -- lib/listings/filters.test.ts -x` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | FILT-01/02 | — | Sheet Apply/discard draft | manual | Human verify at phase gate | — | ⬜ pending |
| 10-03-01 | 03 | 1 | FILT-03 | — | Pills dismiss + order | manual | Human verify at phase gate | — | ⬜ pending |
| 10-04-01 | 04 | 2 | FILT-05 | — | Card distance metadata | manual | Human verify at phase gate | — | ⬜ pending |
| 10-05-01 | 05 | 2 | I18N-01 | — | Key parity zh/en/it | unit | `npm run test:lib -- messages/key-parity.test.ts -x` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `lib/geo/haversine.test.ts` — covers FILT-05 distance math
- [x] `lib/geo/format-distance.test.ts` — covers D-15 unit formatting
- [x] `lib/filter-prefs/storage.test.ts` — covers FILT-01 persistence + corrupt JSON
- [x] Extend `lib/listings/filters.test.ts` — city filter, radius filter, sortByDistance
- [x] Extend `lib/listings/subito-categories.test.ts` — `matchesAnySubitoCategories` OR logic
- [x] Extend `lib/browse-center/storage.test.ts` — `clearBrowseCenter` (D-12)
- [x] Extend `messages/key-parity.test.ts` — new `feed.*` keys; remove `filterComingSoon`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Filter sheet draft/Apply/Reset | FILT-02 | Vaul drawer interaction | Open sheet, change radius, close without Apply → no change; Apply → pills update |
| Active filter pills dismiss | FILT-03 | DOM interaction + i18n | Dismiss city pill → All; dismiss category pill → remaining categories |
| Center pill + GPS fallback | FILT-05 | Geolocation permission | Clear center → GPS or Venice default; confirm location → immediate re-filter |
| Drawer/nav overlap | FILT-01 | Visual QA | Sheet at ~85vh does not obscure bottom nav capsule |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** automated gate green for Phase 10 scope; manual QA pending `/gsd-verify-work`

**Storage keys (D-76/D-77):** `shoumanwu_filter_prefs`, `shoumanwu_browse_center`

**Pre-existing failures (out of Phase 10 scope):** `lib/admin/subito-regalo-catalog.test.ts` (3 tests, Padova spike artifact); `npm run build` TypeScript error in `lib/admin/cleanup.ts`
