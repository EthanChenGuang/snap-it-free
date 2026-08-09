---
phase: 06
slug: scraper-admin-console-configurable-sources-frequency-anti-bl
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-04
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 (root) + Vitest 3.0.0 (scraper) |
| **Config file** | `vitest.config.ts`, `scraper/vitest.config.ts` |
| **Quick run command** | `npm test` (root lib/) + `cd scraper && npm test` |
| **Full suite command** | `npm test && cd scraper && npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run affected package tests only (`npm test` or `cd scraper && npm test`)
- **After every plan wave:** Run `npm test && cd scraper && npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | D-14 | — | Interval bounds 30–1440 enforced | unit | `npm test -- lib/admin/schemas.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | D-20 | T-06-01 | Proxy encrypt/decrypt roundtrip | unit | `npm test -- lib/admin/crypto.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | D-28 | T-06-02 | Allowlist min-one, no self-delete | unit | `npm test -- lib/admin/require-operator.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | D-21 | — | Preset → Crawlee options map | unit | `cd scraper && npm test -- src/admin/presets.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | D-13/D-33 | — | Scheduler picks due sources + jobs | unit | `cd scraper && npm test -- src/scheduler.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 3 | D-43 | — | Daily cap pauses translate only | unit | `npm test -- lib/admin/translation-cap.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 3 | D-26/D-27 | — | Gemini fail → OpenRouter → queue | unit | `npm test -- lib/admin/translate.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-03-03 | 03 | 3 | D-10 | T-06-03 | Venice URL validation | unit | `npm test -- lib/admin/url-validate.test.ts -x` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 2 | SCRP-06 | — | Validation thresholds unchanged | unit | `cd scraper && npm test -- src/shared/validate-run.test.ts -x` | ✅ | ⬜ pending |
| 06-02-04 | 02 | 2 | D-05 | — | Coming-soon run no-op | unit | `cd scraper && npm test -- src/worker-placeholder.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/admin/schemas.ts` + `lib/admin/schemas.test.ts` — Zod bounds, URL arrays
- [ ] `lib/admin/crypto.ts` + test — AES roundtrip
- [ ] `lib/admin/require-operator.ts` + test — allowlist gate (mock Supabase)
- [ ] `lib/admin/translate.ts` + test — provider fallback chain (mock fetch)
- [ ] `scraper/src/config-loader.ts` + test — DB config merge with env fallback
- [ ] `scraper/src/scheduler.ts` + test — due sources, stagger, job dequeue
- [ ] `middleware.ts` + integration smoke — optional manual-only if mock cookies hard
- [ ] Extend `vitest.config.ts` include glob for `lib/admin/**/*.test.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin UI Stitch compliance | D-35/D-36 | Visual audit | Compare each `/admin/*` screen to Stitch `code.html` prototype |
| Operator redirect flow | D-48/D-49 | Auth cookie flow | Log in as non-operator, visit `/admin`, confirm redirect to `/` |
| Global pause stops scraping | D-17 | Worker integration | Toggle pause in admin, confirm worker skips runs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
