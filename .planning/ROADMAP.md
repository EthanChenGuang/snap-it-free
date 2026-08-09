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

**Plans:** 4/4 plans executed

Plans:
**Wave 1**

- [x] 09-01-PLAN.md — Tracer: feed at `/` + 4-tab nav + `/list` redirect (D-01 overrides NAV-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 09-02-PLAN.md — Feed header row, scroll-away, search + description migration

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 09-03-PLAN.md — Select-location flow + browse-center persistence

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 09-04-PLAN.md — Favorites grid, Settings chrome, i18n completion

**Success criteria:**

1. `/` renders two-column listing grid on mobile (Stitch tokens)
2. Bottom nav shows four tabs; active state uses Stitch filled icon + bold primary (not Snag red pill)
3. Location button opens `/select-location`; Post is bottom tab with auth gate (D-01)
4. `/list` permanent redirect to feed without 404

**Depends on:** v1.0 Phase 2 (list/map components)

---

#### Phase 10: Search, Filter Sheet & Distance

**Goal:** Filter bottom sheet (km radius + categories), active filter pills, haversine distance; zone/city filters retained.

**Requirements:** FILT-01–05, I18N-01 (partial)

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

**Success criteria:**

1. Cards show image, FREE badge, heart, truncated title, `{distance} · {time}` or time-only
2. FavoriteButton + login gate works on grid
3. Detail routes unchanged for deep-link / UGC claim

**Depends on:** Phase 10

---

#### Phase 12: Favorites Category Folders

**Goal:** Replace flat favorites list with category folder grid and drill-down.

**Requirements:** FAV-01–03, I18N-01 (partial)

**Success criteria:**

1. Five folder tiles with counts (Furniture, Electronics, Home & Garden, For Kids, Other)
2. Folder tap shows filtered favorites; empty folders show 0 items
3. Category mapping documented for scraped + UGC listings

**Depends on:** Phase 9 (Favorites tab prominence)

---

#### Phase 13: Select Location Flow

**Goal:** Full-screen map picker with fixed center pin, locate FAB, preview, confirm — for filter center and UGC post.

**Requirements:** LOC-01–03, I18N-01 (partial)

**Success criteria:**

1. Select Location screen matches Stitch prototype patterns
2. Confirm persists lat/lng + label for filter or post context
3. Reuses MapLibre and existing pin components

**Depends on:** Phase 9 (location button entry)

---

#### Phase 14: Settings Consumer Parity

**Goal:** Stitch-aligned settings with DND, delete account; retain v1 settings; optional Phase 4 verification doc.

**Requirements:** SET-01–06, TD-01, I18N-01 (partial)

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

## Progress

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1–6, 8 | v1.0 | 39/39 | Shipped | 2026-08-09 |
| 9. Feed-First Home & Nav | v2.0 | 0/4 | In Progress|  |
| 10. Filter Sheet & Distance | v2.0 | 0/? | Planned | — |
| 11. Grid Listing Cards | v2.0 | 0/? | Planned | — |
| 12. Favorites Folders | v2.0 | 0/? | Planned | — |
| 13. Select Location | v2.0 | 0/? | Planned | — |
| 14. Settings Parity | v2.0 | 0/? | Planned | — |
| 7. Production Deploy | v2.0 | 0/4 | Planned | — |

## Execution Order

```
Phase 9 → 10 → 11 → 12 → 13 → 14 → 7
```

UX phases first; deploy last after consumer-facing changes are stable.

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

---
*Roadmap updated: 2026-08-09 — v2.0 milestone initialized*
