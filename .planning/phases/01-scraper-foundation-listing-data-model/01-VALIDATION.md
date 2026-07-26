---
phase: 1
slug: scraper-foundation-listing-data-model
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-26
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `scraper/vitest.config.ts` (Wave 0) |
| **Quick run command** | `cd scraper && npx vitest run --reporter=dot` |
| **Full suite command** | `cd scraper && npx vitest run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd scraper && npx vitest run --reporter=dot`
- **After every plan wave:** Run `cd scraper && npx vitest run --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | SCRP-02 | T-01-01 | Service role key not in client bundle | unit | `cd scraper && npx vitest run src/shared/schema.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 0 | SCRP-03 | — | Zone polygon assigns correct enum | unit | `cd scraper && npx vitest run src/shared/zone-tag.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 0 | SCRP-05 | T-01-02 | Price keywords rejected at normalize | unit | `cd scraper && npx vitest run src/shared/normalize.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 0 | SCRP-06 | T-01-03 | Failed batch does not persist | unit | `cd scraper && npx vitest run src/shared/validate-run.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-02-01 | 01 | 1 | SCRP-02 | — | Dedup skips unchanged hash | unit | `cd scraper && npx vitest run src/shared/dedupe.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-03-01 | 01 | 2 | SCRP-01 | — | Category URLs include Veneto regalo | unit | `cd scraper && npx vitest run src/subito/categories.test.ts -x` | ❌ W0 | ⬜ pending |
| 01-spike | 01 | 1 | SCRP-01 | — | Live Subito DOM verified | integration/manual | Spike task — not in CI | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scraper/package.json` with vitest devDependency and test script
- [ ] `scraper/vitest.config.ts` — TypeScript test runner config
- [ ] `scraper/src/shared/schema.test.ts` — covers SCRP-02
- [ ] `scraper/src/shared/normalize.test.ts` — covers SCRP-05
- [ ] `scraper/src/shared/zone-tag.test.ts` — covers SCRP-03
- [ ] `scraper/src/shared/validate-run.test.ts` — covers SCRP-06
- [ ] `scraper/src/shared/dedupe.test.ts` — covers SCRP-02 dedup
- [ ] `supabase/migrations/` — PostGIS + listings + audit tables
- [ ] Framework install: `cd scraper && npm install -D vitest`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Subito scrape | SCRP-01 | Anti-bot + DOM drift; spike only | Run spike against live category page; document selectors |
| Operator alert delivery | SCRP-06 | External email/Telegram service | Trigger validation failure; confirm alert received |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
