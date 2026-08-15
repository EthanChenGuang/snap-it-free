---
phase: 18
slug: facebook-marketplace-scraping
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-15
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (root + `scraper/vitest.config.ts`) |
| **Config file** | `/vitest.config.ts`, `/scraper/vitest.config.ts` |
| **Quick run command** | `npm run test:lib -- lib/listings/canonical-categories.test.ts -x` |
| **Full suite command** | `npm test && cd scraper && npm test` |
| **Estimated runtime** | ~60–120 seconds |

---

## Sampling Rate

- **After every task commit:** `cd scraper && npm test -- src/facebook/ -x` (after Wave 0 fixtures land)
- **After every plan wave:** `npm run test:lib && cd scraper && npm test`
- **Before `/gsd-verify-work`:** Wave 0 artifact PASS + full suite green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-W0 | 01 | 0 | Wave 0 spike (D-18-19) | T-18-SSRF | Admin URLs facebook.com only | manual/env | `FB_SESSION_JSON=… PROXY_URL=… node scraper/scripts/spike-facebook-marketplace.mjs` | ❌ W0 | ⬜ pending |
| 18-E01 | 02+ | 1+ | SCRP-E01 | T-18-GraphQL | Parse known GraphQL card fields only | unit | `cd scraper && npm test -- src/facebook/graphql-extract.test.ts -x` | ❌ W0 | ⬜ pending |
| 18-E02 | 02+ | 1+ | D-18-02/03 | — | Free price gate; reject ambiguous | unit | `cd scraper && npm test -- src/facebook/filters.test.ts -x` | ❌ W0 | ⬜ pending |
| 18-E03 | 02+ | 1+ | D-18-04 | — | Reject shipping-only listings | unit | `cd scraper && npm test -- src/facebook/filters.test.ts -x` | ❌ W0 | ⬜ pending |
| 18-E04 | 02+ | 1+ | D-18-09/12 | T-18-Session | Session probe detects expiry | unit | `cd scraper && npm test -- src/facebook/session.test.ts -x` | ❌ W0 | ⬜ pending |
| 18-E05 | 03+ | 2+ | CAT-01 | — | Facebook resolver branch | unit | `npm run test:lib -- lib/listings/canonical-categories.test.ts -x` | ✅ extend | ⬜ pending |
| 18-E06 | 03+ | 2+ | CAT-03 | — | FB category map coverage | unit | `facebook-category-map.test.ts` | ❌ W0 | ⬜ pending |
| 18-E07 | 03+ | 2+ | D-18-11 | T-18-Crypto | session_enc encrypt roundtrip | unit | `npm run test:lib -- lib/admin/crypto.test.ts -x` | ✅ extend | ⬜ pending |
| 18-E08 | 04+ | 3+ | D-18-24 | — | Marketplace URL regex | unit | `npm run test:lib -- lib/admin/url-validate.test.ts -x` | ✅ extend | ⬜ pending |
| 18-E09 | 03+ | 2+ | SCRP-E02 | — | Early-stop integration | unit | `cd scraper && npm test -- src/subito/early-stop.test.ts -x` | ✅ reuse | ⬜ pending |
| 18-E10 | 05+ | 4+ | D-18-42/43 | — | FREE badge + Facebook chip | unit/component | card + external-url tests | ✅ extend | ⬜ pending |
| 18-E11 | 05+ | 4+ | I18N-01 | — | sourceFacebook strings | unit/manual | grep `sourceFacebook` messages/*.ts | ❌ impl | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scraper/scripts/spike-facebook-marketplace.mjs` — live hard gate
- [ ] `.planning/phases/18-facebook-marketplace-scraping/18-SPIKE-FACEBOOK-MARKETPLACE.md` — verdict artifact
- [ ] `scraper/fixtures/facebook-search-graphql-sample.json`
- [ ] `scraper/fixtures/facebook-item-detail-fragment.json`
- [ ] `scraper/src/facebook/graphql-extract.test.ts`
- [ ] `scraper/src/facebook/filters.test.ts`
- [ ] `scraper/src/facebook/session.test.ts`
- [ ] `lib/listings/facebook-category-map.ts` + tests
- [ ] `lib/admin/facebook-recommended-seed.ts` — 6 default URLs
- [ ] `supabase/migrations/029_facebook_session_enc.sql`
- [ ] `components/admin/FacebookUrlMatrix.tsx`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live 3-URL FB Marketplace spike | Wave 0 gate (D-18-19) | Live facebook.com; operator session + residential proxy | Run spike script; record in `18-SPIKE-FACEBOOK-MARKETPLACE.md` |
| Admin session upload + test | D-18-10/11 | Operator workflow | Paste cookies, Test session, save encrypted session_enc |
| Padova URL first manual run | D-18-30 | Padova not in Wave 0 spike | Enable source, run crawl, verify Padova bbox |
| Mixed feed FB + Subito + Vinted | D-18-41 | Needs persisted listings | Verify chronological sort in dev feed after crawl |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
