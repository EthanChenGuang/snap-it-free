---
phase: 07
slug: deploy-it-to-vercel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-04
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 (root) + Vitest 3.0.0 (scraper) |
| **Config file** | `vitest.config.ts`, `scraper/vitest.config.ts` |
| **Quick run command** | `npm run build && npm test` |
| **Full suite command** | `npm run build && npm test && cd scraper && npm test` |
| **Estimated runtime** | ~90 seconds (build + tests) |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` + affected tests
- **After every plan wave:** Run full suite + D-19 smoke subset for that wave
- **Before `/gsd-verify-work`:** Full suite green + all 5 D-19 smoke checks
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 0 | D-15 | T-07-01 | vercel.json has no sub-daily cron | unit | `! grep -q '\*/3' vercel.json` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 0 | D-09 | T-07-02 | .env.example lists VAPID/CRON | unit | `grep -q CRON_SECRET .env.example && grep -q VAPID .env.example` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 0 | D-13/D-14 | — | MapLibre worker + SW after build | build | `npm run build && test -f public/maplibre/maplibre-gl-worker.mjs && test -f public/sw.js` | ✅ | ⬜ pending |
| 07-02-01 | 02 | 1 | D-01/D-18 | — | Production build succeeds | build | `npm run build` | ✅ | ⬜ pending |
| 07-02-02 | 02 | 1 | D-16 | T-07-01 | Cron 401 without bearer | integration | manual curl after deploy | ✅ route | ⬜ pending |
| 07-03-01 | 03 | 2 | D-02 | — | fly.toml exists, no http_service | unit | `test -f scraper/fly.toml && ! grep -q http_service scraper/fly.toml` | ❌ W0 | ⬜ pending |
| 07-03-02 | 03 | 2 | D-19(5) | — | Worker scheduler tests pass | unit | `cd scraper && npm test -- src/scheduler.test.ts` | ✅ | ⬜ pending |
| 07-04-01 | 04 | 3 | D-19 | — | Full smoke checklist | manual | D-19 table in 07-RESEARCH.md | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Fix `vercel.json` — remove sub-daily cron (Hobby deploy blocker)
- [ ] Align `.env.example` with VAPID/CRON/production env inventory
- [ ] Create `scraper/fly.toml` — background worker, 512MB, `ams`
- [ ] Local build verification — MapLibre worker + Serwist SW emitted

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth round-trip | D-19(2) | Requires live Supabase + Google console | Settings → Accedi → Google on production URL |
| Push subscribe on HTTPS | D-17 | Secure context + real VAPID | Settings push toggle on `https://*.vercel.app` |
| Fly worker scrape log | D-19(5) | Requires Fly deploy + Supabase | `fly logs` shows successful scrape run |
| Vercel instant rollback | D-20 | Dashboard action | Rollback prior deployment; re-smoke map + auth |
| External cron 3-min ping | D-15b | External SaaS config | cron-job.org dashboard shows 200 responses |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] D-19 smoke checklist documented in final plan
- [ ] `nyquist_compliant: true` set in frontmatter after verify

**Approval:** pending
