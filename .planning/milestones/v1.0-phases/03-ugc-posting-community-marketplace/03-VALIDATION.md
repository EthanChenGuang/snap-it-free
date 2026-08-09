---
phase: 3
slug: ugc-posting-community-marketplace
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-30
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` (root); `include: ['lib/**/*.test.ts']` |
| **Quick run command** | `npm run test:lib` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:lib`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-02 | 01 | 1 | UGC-01, UGC-03, UGC-04 | T-03-01, T-03-02 | EXIF stripped; auth required on post | build | `npx next build` | ✓ | ⬜ pending |
| 03-01-03 | 01 | 1 | UGC-02, UGC-03 | T-03-01 | Zone tag + EXIF strip contracts | unit | `npm run test:lib -- lib/geo/zone-tag.test.ts lib/ugc/schemas.test.ts lib/ugc/exif-strip.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | CONT-05 | — | Safety strings in messages/it | unit | `npm run test:lib -- messages/it.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | CONT-01, CONT-04 | T-03-02 | DM requires auth | unit | `npm run test:lib -- lib/messages/schemas.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 3 | MOD-01, MOD-02 | — | Report schema + thresholds | unit | `npm run test:lib -- lib/reports/schemas.test.ts lib/reports/auto-hide.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-03 | 04 | 4 | CONT-02, CONT-03, UGC-02 | — | Status transitions + rate limits | unit | `npm run test:lib -- lib/ugc/status.test.ts lib/ugc/rate-limit.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/geo/zone-tag.ts` + `lib/geo/zone-tag.test.ts` — port from scraper (UGC-02, D-63)
- [ ] `lib/ugc/schemas.ts` + `lib/ugc/schemas.test.ts` — Zod validation (UGC-01)
- [ ] `lib/ugc/exif-strip.ts` + `lib/ugc/exif-strip.test.ts` — sharp pipeline (UGC-03)
- [ ] `lib/messages/schemas.test.ts` — conversation create schema (CONT-01)
- [ ] `lib/reports/auto-hide.test.ts` — threshold 2 scraped / 3 UGC (MOD-02)
- [ ] `lib/ugc/rate-limit.test.ts` — post/DM limits (D-85)
- [ ] `messages/it.test.ts` — safety copy keys (CONT-05)
- [ ] Framework install: `npm install sharp @turf/boolean-point-in-polygon`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Magic link email delivery | UGC-04 | Supabase SMTP operator config | Send magic link on dev; confirm email received |
| EXIF strip on real photo | UGC-03 | Binary fixture variance | Upload phone photo; verify no GPS in Storage object via exiftool |
| Street Dump GPS confirm | UGC-02 | Device geolocation | Test on mobile browser; confirm pin never auto-submits |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] `nyquist_compliant: true` before phase seal
