# Roadmap: 手慢无 (ShouManWu) — Venice Free Finds

## Milestones

- ✅ **v1.0 Venice Free Finds MVP** — Phases 1–6, 8 (shipped 2026-08-09) — [full details](milestones/v1.0-ROADMAP.md)
- 📋 **v2.0 Production Deploy** — Phase 7 (planned)

## Overview

v1.0 shipped the full product loop: scraper → Supabase → map/list browsing, UGC marketplace, auth-gated favorites/alerts/push, trilingual UI, operator admin console, and Subito regalo URL matrix (Venice + Padova). v2.0 focuses on production deployment.

## Phases

<details>
<summary>✅ v1.0 Venice Free Finds MVP (Phases 1–6, 8) — SHIPPED 2026-08-09</summary>

- [x] **Phase 1: Scraper Foundation & Listing Data Model** — 4/4 plans (2026-07-28)
- [x] **Phase 2: Map + List Core Browsing** — 5/5 plans (2026-07-28)
- [x] **Phase 3: UGC Posting & Community Marketplace** — 4/4 plans (2026-08-01)
- [x] **Phase 4: Auth, Alerts & Push Notifications** — 7/7 plans (2026-08-09)
- [x] **Phase 5: Trilingual UI (Italian / English / Chinese)** — 3/3 plans (2026-08-04)
- [x] **Phase 6: Scraper Admin Console** — 9/9 plans (2026-08-04)
- [x] **Phase 8: Subito Regalo URL Matrix** — 7/7 plans (2026-08-09)

See [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) for full phase details, success criteria, and plan history.

</details>

### 📋 v2.0 Production Deploy (Planned)

- [ ] **Phase 7: deploy it to Vercel** — 0/4 plans — production deploy on Vercel + Fly.io worker

**Goal:** PWA on Vercel Hobby, scraper worker on Fly.io, production OAuth, alert cron, D-19 smoke checklist.

**Depends on:** Phase 6 (complete in v1.0)

**Resume:** `/gsd-new-milestone` then `/gsd-execute-phase 7`

Plans and context preserved in [milestones/v1.0-phases/07-deploy-it-to-vercel/](milestones/v1.0-phases/07-deploy-it-to-vercel/).

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Scraper Foundation | v1.0 | 4/4 | Shipped | 2026-07-28 |
| 2. Map + List Browsing | v1.0 | 5/5 | Shipped | 2026-07-28 |
| 3. UGC Marketplace | v1.0 | 4/4 | Shipped | 2026-08-01 |
| 4. Auth, Alerts & Push | v1.0 | 7/7 | Shipped | 2026-08-09 |
| 5. Trilingual UI | v1.0 | 3/3 | Shipped | 2026-08-04 |
| 6. Scraper Admin Console | v1.0 | 9/9 | Shipped | 2026-08-04 |
| 7. Deploy to Vercel | v2.0 | 0/4 | Planned | — |
| 8. Subito Regalo URL Matrix | v1.0 | 7/7 | Shipped | 2026-08-09 |

## Deferred to v2.0

| Phase | Name | Reason | Resume |
|-------|------|--------|--------|
| 7 | deploy it to Vercel | Operator choice — v1.0 focused on supply matrix + feature completeness before production deploy | `/gsd-execute-phase 7` after `/gsd-new-milestone` |

---
*Roadmap updated: 2026-08-09 after v1.0 milestone*
