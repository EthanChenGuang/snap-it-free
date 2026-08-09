---
phase: 9
slug: feed-first-home-navigation-ia
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-09
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:lib` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:lib`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | HOME-03 | — | N/A | manual | curl -I localhost:3000/list | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | D-27 | T-09-01 | Validate lat/lng bounds before localStorage write | unit | `npx vitest run lib/browse-center/storage.test.ts -x` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | HOME-02 | — | N/A | unit | `npx vitest run lib/listings/feed-search.test.ts -x` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | I18N-01 | — | N/A | unit | `npx vitest run messages/key-parity.test.ts -x` | ✅ | ⬜ pending |
| 09-03-01 | 03 | 2 | NAV-01 | — | N/A | manual | — | ❌ | ⬜ pending |
| 09-03-02 | 03 | 2 | HOME-01 | — | N/A | manual | — | ❌ | ⬜ pending |
| 09-04-01 | 04 | 2 | NAV-03/D-19 | — | N/A | manual | — | ❌ | ⬜ pending |
| 09-05-01 | 05 | 5 | NAV-03/G-09-7 | T-09-10 | Bounds validation on browse center write | structural | `! rg -q 'dynamic\(' components/map/SelectLocationClient.tsx && test -f components/map/SelectLocationMapPane.tsx` | ❌ | ⬜ pending |
| 09-05-02 | 05 | 5 | NAV-03/G-09-7 | T-09-11 | Local dev probe only | integration | `E2E_BASE_URL=http://localhost:3003 node scripts/verify-select-location-dev.mjs` | ❌ | ⬜ pending |
| 09-05-03 | 05 | 5 | NAV-03/G-09-7 | T-09-10 | Finite lat/lng on Confirm write | e2e | `E2E_BASE_URL=http://localhost:3003 node scripts/verify-select-location-dev.mjs --browser` | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/browse-center/storage.ts` + provider — browse center persist (D-27)
- [ ] `lib/browse-center/storage.test.ts` — browse center persist round-trip
- [ ] `lib/listings/feed-search.test.ts` — HOME-02 search matcher (D-06)
- [ ] New i18n keys added to `messages/{zh,en,it}.ts` — covered by key-parity test

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 2-col grid renders on mobile | HOME-01 | Visual layout | Open `/` at 375px width; verify `grid-cols-2` |
| 4-tab bottom nav with Stitch active state | NAV-01 | Visual + interaction | Tap each tab; verify filled icon + bold primary on active |
| `/` is feed not map | NAV-04 | Route behavior | Navigate to `/`; confirm grid feed not MapLibre home |
| Scroll-away header | D-08 | Scroll interaction | Scroll down on feed; header hides; scroll up reveals |
| Select-location flow | NAV-03 | Map interaction | Tap location icon; pan map; Confirm returns to feed |
| Post tab auth gate | D-18 | Auth modal | Log out; tap Post; verify AuthPromptModal |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
