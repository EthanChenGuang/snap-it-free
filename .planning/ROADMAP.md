# Roadmap: 手慢无 (ShouManWu) — Venice Free Finds

## Milestones

- ✅ **v1.0 Venice Free Finds MVP** — Phases 1–6, 8 (shipped 2026-08-09) — [full details](milestones/v1.0-ROADMAP.md)
- 🚧 **v2.0 Snag-style Consumer UX + Production Deploy** — Phases 9–14, 7 (planning)

## Overview

v1.0 shipped map-first browsing, scraper + admin, UGC marketplace, auth/alerts/push, and trilingual UI. v2.0 pivots consumer IA to **feed-first grid browsing** (Snag-style interaction patterns, **Google Stitch** visual language), adds radius/distance filters, category-folder favorites, select-location flow, settings parity (DND, delete account), then **production deploy** (deferred Phase 7).

**Design authority:** `.planning/google-stitch-ui-design/DESIGN.md` — monochrome document-first; reference app screenshots are interaction benchmarks only.

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

See [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) for full phase details.

</details>

### 🚧 v2.0 Snag-style Consumer UX + Production Deploy

#### Phase 9: Feed-First Home & Navigation IA

**Goal:** Grid feed becomes default home; four-tab bottom nav (Home · Post · Favorites · Settings); map demoted to select-location flow; unified feed header row.

**Requirements:** NAV-01–04, HOME-01–03, I18N-01 (partial)

**Plans:** 5/5 plans complete

Plans:
**Wave 1**

- [x] 09-01-PLAN.md — Tracer: feed at `/` + 4-tab nav + `/list` redirect (D-01 overrides NAV-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 09-02-PLAN.md — Feed header row, scroll-away, search + description migration

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 09-03-PLAN.md — Select-location flow + browse-center persistence

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 09-04-PLAN.md — Favorites grid, Settings chrome, i18n completion

**Wave 5** *(gap closure G-09-7)*

- [x] 09-05-PLAN.md — Fix select-location dev chunk hydration + UAT test 7

**Success criteria:**

1. `/` renders two-column listing grid on mobile (Stitch tokens)
2. Bottom nav shows four tabs; active state uses Stitch filled icon + bold primary (not Snag red pill)
3. Location button opens `/select-location`; Post is bottom tab with auth gate (D-01)
4. `/list` permanent redirect to feed without 404

**Depends on:** v1.0 Phase 2 (list/map components)

---

#### Phase 10: Search, Filter Sheet & Distance

**Goal:** Filter bottom sheet (km radius + categories), active filter pills, haversine distance; zone/city filters retained (consumer override: city-only per D-01).

**Requirements:** FILT-01–05, I18N-01 (partial)

**Plans:** 5/5 plans executed

Plans:
**Wave 0**

- [x] 10-01-PLAN.md — Wave 0 TDD: haversine, filter-prefs, city/radius helpers, clearBrowseCenter

**Wave 1** *(blocked on Wave 0)*

- [x] 10-02-PLAN.md — Tracer: FilterSheet + city filter E2E; D-01 city-only checkpoint

**Wave 2** *(blocked on Wave 1)*

- [x] 10-03-PLAN.md — Full pipeline, radius/categories sheet, active pills row

**Wave 3** *(blocked on Wave 2)*

- [x] 10-04-PLAN.md — Card distance metadata, select-location cleanup, center pill

**Wave 4** *(blocked on Wave 3)*

- [x] 10-05-PLAN.md — i18n completion, stub removal, phase gate verification

**Success criteria:**

1. Filter sheet: radius slider (km, persisted), category multi-select, Apply/Reset
2. Pills reflect active category, radius, and zone filters; dismissible
3. Listings filtered by haversine when radius set; no-coord listings handled consistently
4. Card metadata shows distance when geolocation granted

**Depends on:** Phase 9

---

#### Phase 11: Grid Listing Cards

**Goal:** Polished grid cards with FREE badge, favorite heart, simplified metadata; no Claim on grid.

**Requirements:** CARD-01–05, I18N-01 (partial)

**Plans:** 4/4 plans complete

Plans:
**Wave 0**

- [x] 11-01-PLAN.md — Wave 0 TDD: extract buildCardMetadata to lib/listings/card-metadata.ts + tests

**Wave 1** *(blocked on Wave 0)*

- [x] 11-02-PLAN.md — Tracer: ListListingCard claimed suffix + dim + wire metadata helper on feed

**Wave 2** *(blocked on Wave 1)*

- [x] 11-03-PLAN.md — FavoritesPageClient dedupe heart + distance wiring + gap alignment

**Wave 3** *(blocked on Wave 2)*

- [x] 11-04-PLAN.md — i18n verification + phase gate

**Success criteria:**

1. Cards show image, FREE badge, heart, truncated title, `{distance} · {time}` or time-only
2. FavoriteButton + login gate works on grid
3. Detail routes unchanged for deep-link / UGC claim

**Depends on:** Phase 10

---

#### Phase 12: Canonical Category Mapping

**Goal:** Unified canonical category mapping across listing sources (Subito scraped, UGC, future Facebook stub) using 17 Subito regalo slugs as canonical IDs.

**Requirements:** CAT-01–03, I18N-01 (partial)

**Plans:** 4/4 plans complete

Plans:
**Wave 0**

- [x] 12-01-PLAN.md — Tracer: canonical-categories TDD module + filter consumer + Wave 0 docs (D-19–D-24)

**Wave 1** *(blocked on Wave 0)*

- [x] 12-02-PLAN.md — Refactor subito-categories + listing-fields to delegate to resolver

**Wave 2** *(blocked on Wave 1)*

- [x] 12-03-PLAN.md — UGC insert path persists category slug (PostCategory → DB column)

**Wave 3** *(blocked on Wave 2)*

- [x] 12-04-PLAN.md — Integration grep audits, full lib suite, phase gate

**Success criteria:**

1. `resolveCanonicalCategorySlug` resolves Subito, UGC, and title-inference paths
2. New UGC posts persist canonical slug in `listing.category`
3. Slug mapping tables documented and covered by unit tests
4. FilterSheet category checklist behavior unchanged; favorites remain flat grid

**Depends on:** Phase 11

---

### Phase 12.1: Category Names i18n (it/zh/en) (INSERTED)

**Goal:** Trilingual UI labels for the 17 Subito regalo category slugs in filter/chip/pill surfaces and listing detail fallback.

**Requirements:** I18N-01

**Depends on:** Phase 12

**Plans:** 2/2 plans complete

Plans:

- [x] 12.1-01-PLAN.md — Wave 0: messages.feed.subitoCategories maps + getSubitoCategoryLabel extension + tests
- [x] 12.1-02-PLAN.md — Wave 1: wire UI callers, resolveListingCategory, UAT locale checks, ROADMAP sign-off

**Success criteria:**

1. FilterSheet category labels display in active locale (en/zh/it), not always Italian
2. SubitoCategoryFilterChips and feed header pills match locale
3. Listing detail: DB category_en/zh wins when set; else static messages map
4. PostForm 6-category picker unchanged; FilterSheet layout unchanged (17 checkboxes)

#### Phase 13: Select Location Flow

**Goal:** Full-screen map picker with fixed center pin, locate FAB, preview, confirm — for filter center and UGC post.

**Requirements:** LOC-01–03, I18N-01 (partial)

**Plans:** 5/5 plans executed

Plans:
**Wave 0**

- [x] 13-01-PLAN.md — Lib foundation: resolveCityLabel promotion + shoumanwu_post_draft storage (TDD)

**Wave 1** *(blocked on Wave 0)*

- [x] 13-02-PLAN.md — Tracer: post-context picker context branching + PostForm pickup-location row

**Wave 2** *(blocked on Wave 1)*

- [x] 13-03-PLAN.md — Live preview + aria-live + ready-gated Confirm + Stitch flat-card corrections

**Wave 3** *(blocked on Wave 2)*

- [x] 13-04-PLAN.md — Phase gate: integration audit, full lib suite, VALIDATION.md sign-off

**Gap closure**

- [x] 13-05-PLAN.md — Restore missing infrastructure; green test:lib + build (nyquist_compliant)

**Success criteria:**

1. Select Location screen matches Stitch prototype patterns
2. Confirm persists lat/lng + label for filter or post context
3. Reuses MapLibre and existing pin components

**Depends on:** Phase 9 (location button entry)

---

#### Phase 14: Settings Consumer Parity

**Goal:** Stitch-aligned settings with DND, delete account; retain v1 settings; optional Phase 4 verification doc.

**Requirements:** SET-01–06, TD-01, I18N-01 (partial)

**Plans:** 8/8 plans executed

Plans:
**Wave 0**

- [x] 14-01-PLAN.md — DB migration 022 (user_notification_prefs + delete_account_data RPC) + blocking push
- [x] 14-02-PLAN.md — DND lib TDD: isQuietHoursActive, loadUserQuietHours, syncUserNotificationPrefs
- [x] 14-03-PLAN.md — Delete-account lib TDD: deleteAccountData orchestration (Storage → RPC → admin.deleteUser)
- [x] 14-04-PLAN.md — DND + Account i18n keys (zh/en/it)

**Wave 1** *(blocked on Wave 0)*

- [x] 14-05-PLAN.md — Tracer: DND end-to-end (NotificationsSection UI, GET/PATCH route, cron enforcement)
- [x] 14-06-PLAN.md — Delete Account end-to-end (AccountSection UI, GET/POST route)

**Wave 2** *(blocked on Wave 1)*

- [x] 14-07-PLAN.md — Phase gate: TD-01 04-VERIFICATION.md + regression audit + 14-VALIDATION.md sign-off

**Wave 3** *(gap closure from 14-VERIFICATION.md)*

- [x] 14-08-PLAN.md — Close D-14 event-order mismatch + full suite/lint green (test debt alignment)

**Success criteria:**

1. Push toggle, language, sign out restyled to Stitch settings layout
2. DND quiet hours suppress or defer push delivery
3. Delete account removes Supabase user + associated rows with confirmation UX
4. Keyword alerts, zone, appearance, iOS A2HS shortcuts unchanged

**Depends on:** Phase 9

---

#### Phase 7: Production Deploy (Vercel + Fly.io)

**Goal:** Production URLs live; worker + cron + OAuth + smoke checklist green.

**Requirements:** DEPLOY-01–05, TD-02, TD-03

**Success criteria:**

1. PWA accessible on production Vercel URL
2. Fly.io worker ingests on schedule
3. Alert cron runs externally; push smoke on production
4. D-19 checklist + DEPLOY-RUNBOOK complete
5. iPhone push QA and Google OAuth redirects verified

**Depends on:** Phases 9–14 (ship UX before prod cutover)

**Plans preserved:** [milestones/v1.0-phases/07-deploy-it-to-vercel/](milestones/v1.0-phases/07-deploy-it-to-vercel/) (4 plans + context)

---

#### Phase 15: Scraper Incremental Crawl & Search Efficiency

**Goal:** Replace the Subito worker's N+1 Playwright detail loop with an HTTP-first category JSON path, DB-aware incremental early-stop, a documented proxy strategy for production anti-bot, and a confirmed Crawlee hybrid stack (HttpCrawler primary + Playwright fallback only).

**Requirements:** SCRP-E01–SCRP-E08

**Depends on:** v1.0 Phases 1, 6, 8 (scraper foundation + admin + URL matrix). **Recommended before Phase 7** (Production Deploy).

**Plans:** 6/6 plans executed

Plans:

- [x] 15-01-PLAN.md — Wave 0 spike hard gate + stack/proxy ADRs (SCRP-E01/E05/E06)
- [x] 15-02-PLAN.md — Migration 023 crawl metrics schema + blocking push
- [x] 15-03-PLAN.md — Tracer: HTTP extract + crawl hash + early-stop + known-set
- [x] 15-04-PLAN.md — HttpCrawler primary + Playwright fallback queue + feature flag
- [x] 15-05-PLAN.md — Worker crawl mode, soft proxy gate, JSON validation, metrics, email alerts
- [x] 15-06-PLAN.md — Admin crawl config, proxy health, degraded banner, run metrics UI

**Success criteria:**

1. Category URL extraction uses embedded JSON (`__NEXT_DATA__` or equivalent) — **≤1 HTTP request per category page** on the happy path (not 1 + N detail visits)
2. Incremental crawl: load known `external_id` set; skip unchanged listings at **crawl layer**; early-stop after K consecutive known listings; periodic full refresh (default 24h)
3. Playwright used only for fallback (missing coords/description), pagination button clicks, or HTTP-block retry — not every listing
4. Proxy ADR documented: dev optional; production full-matrix requires residential (Italian egress recommended); admin surfaces proxy configured / not configured
5. Tech stack ADR: **keep Crawlee + Node**; primary engine **HttpCrawler**; Playwright secondary — no Python/Apify rewrite
6. Run metrics distinguish crawl-skipped vs persist-skipped; wall time and request count drop measurably vs baseline (target: ≥10× fewer requests for 34-URL matrix)
7. Existing batch validation (count, selector/geo rates) still passes or thresholds updated with documented rationale
8. Spike artifact in phase dir proves JSON field map on live Subito regalo category URL (incl. Venezia `arredamento-casalinghi` path)

**Context:** [phases/15-scraper-incremental-crawl-and-search-efficiency/15-CONTEXT.md](phases/15-scraper-incremental-crawl-and-search-efficiency/15-CONTEXT.md)

---

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1–6, 8 | v1.0 | 39/39 | Shipped | 2026-08-09 |
| 9. Feed-First Home & Nav | v2.0 | 5/5 | Complete | 2026-08-09 |
| 10. Filter Sheet & Distance | v2.0 | 5/5 | Complete | 2026-08-10 |
| 11. Grid Listing Cards | v2.0 | 4/4 | Complete | 2026-08-10 |
| 12. Canonical Category Mapping | v2.0 | 4/4 | Complete | 2026-08-10 |
| 13. Select Location | v2.0 | 5/5 | Verified | 2026-08-10 |
| 14. Settings Parity | v2.0 | 8/8 | Complete | 2026-08-10 |
| 15. Scraper Crawl Efficiency | v2.0 | 6/6 | Complete | 2026-08-11 |
| 16. Proxy Cost Optimization | v2.0 | 0/5 | In Progress|  |
| 7. Production Deploy | v2.0 | 0/4 | Planned | — |

## Execution Order

```
Phase 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 7
```

UX phases first; **scraper efficiency before production deploy**; deploy last.

## Reference Material

Snag-style interaction reference screenshots (feed grid, filter sheet, favorites folders, select location, settings) stored in workspace assets. Port interaction patterns to Stitch — do not clone Snag visual language.

**Route mapping (v1 → v2 target):**

| v1 Route | v2 Target |
|----------|-----------|
| `/` (map) | `/` (grid feed); map via location button |
| `/list` | merged into `/` |
| `/favorites` | category folder grid |
| `/settings` | expanded consumer settings |
| `/post` | drawer/menu entry (not bottom tab) |

### Phase 16: Proxy Cost Optimization — evaluate free/self-hosted vs cheaper providers

**Goal:** Reduce or eliminate recurring proxy spend while keeping Subito incremental crawl reliable. Evaluate whether direct/degraded crawl (already supported) is sufficient; if not, switch to the cheapest residential provider with measured block-rate comparison.

**Requirements:** PROXY-C01, PROXY-C02, PROXY-C03, PROXY-C04, PROXY-C05

**Depends on:** Phase 15

**Plans:** 1/5 plans executed

Plans:
**Wave 1**

- [x] 16-01-PLAN.md — Tracer: proxy quota fatal → direct fallback + degraded metrics (PROXY-C04)
- [ ] 16-02-PLAN.md — Research verdict + ADR cost ladder draft + spike scripts (PROXY-C01)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 16-03-PLAN.md — 7-day direct production spike + decision gate (PROXY-C02)
- [ ] 16-04-PLAN.md — Webshare/IPRoyal vs Decodo provider comparison (PROXY-C03)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 16-05-PLAN.md — Admin cost tier UI + ADR finalization + phase gate (PROXY-C05)

**Success criteria:**

1. Research artifact documents free/OSS options with honest verdict (no free residential pool exists)
2. 7-day production spike: direct crawl block rate measured; decision gate documented
3. If residential needed: Webshare (or IPRoyal) trial compared against Decodo on same URL matrix
4. Worker implements proxy-quota fatal → direct fallback + degraded (optional but recommended)
5. ADR 015 addendum: cost ladder + when residential is optional vs required
6. Admin settings show proxy cost tier recommendation based on measured block rate

**Context:** [phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-RESEARCH.md](phases/16-proxy-cost-optimization-evaluate-free-self-hosted-vs-cheaper/16-RESEARCH.md)

---
*Roadmap updated: 2026-08-11 — Phase 15 expanded (incremental + proxy + stack ADR)*
