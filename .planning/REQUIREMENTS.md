# Requirements: 手慢无 (ShouManWu) — v2.0

**Defined:** 2026-08-09  
**Milestone:** v2.0 — Snag-style Consumer UX + Production Deploy  
**Core Value:** Users can find and claim real free items near them in Venice faster than by manually checking Subito/FB Marketplace/community groups themselves.

## v2.0 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Navigation & Information Architecture

- [x] **NAV-01**: Bottom navigation is Home · Favorites · Settings (Stitch-styled; not a Snag red floating capsule clone)
- [x] **NAV-02**: Post (UGC) remains accessible via menu/drawer — not a primary bottom tab
- [x] **NAV-03**: Map is a secondary entry opened from the top-right location button (not the default home)
- [x] **NAV-04**: Default route `/` shows the grid feed home (replacing map-first home)

### Home Feed & Search Bar

- [x] **HOME-01**: Mobile two-column grid displays listings (image, truncated title, metadata row)
- [x] **HOME-02**: Top search row includes language control, search field, filter button, and location button
- [x] **HOME-03**: Legacy `/list` route merges into or redirects to the feed home without breaking bookmarks

### Search, Filters & Distance

- [x] **FILT-01**: Filter bottom sheet exposes km radius slider (1–50 km, user preference persisted) and category multi-select mapped to existing Subito/UGC categories
- [x] **FILT-02**: Filter sheet has Apply and Reset actions; radius and categories compose with existing zone/city filters
- [x] **FILT-03**: Active filter pills appear below the search bar (e.g. category ×, radius, zone) and are dismissible
- [x] **FILT-04**: Venice zone chips (Centro / Mestre / Lido) and Padova city filter remain available alongside radius
- [x] **FILT-05**: Distance filtering uses client-side haversine on lat/lng; listings without coordinates are excluded from radius results or sorted last

### Listing Grid Cards

- [ ] **CARD-01**: Grid cards show listing image, truncated title, and relative posted time
- [ ] **CARD-02**: When browser geolocation is granted, metadata shows `{distance} · {relative time}` via haversine to listing coordinates
- [ ] **CARD-03**: FREE badge overlays scraped and UGC listing images on the grid
- [ ] **CARD-04**: Favorite heart on each card reuses FavoriteButton with existing login gate
- [ ] **CARD-05**: Grid cards omit Claim CTA; detail page retains deep-link (scraped) and claim/reserve (UGC)

### Favorites Organization

- [ ] **FAV-01**: Favorites screen shows a category folder grid (Furniture, Electronics, Home & Garden, For Kids, Other) mapped from listing category
- [ ] **FAV-02**: Tapping a folder drills into favorites filtered to that category
- [ ] **FAV-03**: Empty folders display with 0-item count and appropriate empty state

### Select Location

- [ ] **LOC-01**: Full-screen Select Location flow: MapLibre map, fixed center pin, locate-me FAB, address/label preview, Confirm action
- [ ] **LOC-02**: Confirmed location can set filter center point and/or UGC post coordinates (reuse existing pin components)
- [ ] **LOC-03**: Location button on home opens map view or select-location flow per context (browse center vs. post)

### Settings (Consumer)

- [ ] **SET-01**: Push notifications toggle retained and restyled to Stitch settings layout
- [ ] **SET-02**: Do Not Disturb: user-configurable quiet hours or silent-push window for notifications
- [ ] **SET-03**: Language selection retained (zh / en / it)
- [ ] **SET-04**: Delete account: Supabase account deletion with associated user data cleanup (auth-gated, destructive confirmation)
- [ ] **SET-05**: Sign out retained
- [ ] **SET-06**: Existing settings preserved: keyword alerts, zone preferences, appearance, iOS Add-to-Home-Screen shortcuts

### Production Deploy

- [ ] **DEPLOY-01**: Next.js PWA deployed to Vercel with production env and Serwist service worker
- [ ] **DEPLOY-02**: Scraper worker deployed to Fly.io reading Supabase DB config
- [ ] **DEPLOY-03**: Production OAuth redirect URLs configured (Google + existing providers)
- [ ] **DEPLOY-04**: External cron runs alert matcher (cron-job.org or equivalent)
- [ ] **DEPLOY-05**: D-19 smoke checklist passes; DEPLOY-RUNBOOK documents rollback

### Internationalization

- [x] **I18N-01**: All new user-facing strings added to zh, en, and it locale files

### Tech Debt (carry-forward, execute if low cost)

- [ ] **TD-01**: Phase 4 formal `04-VERIFICATION.md` completed
- [ ] **TD-02**: Physical iPhone standalone push QA sign-off (v1 UAT test 12)
- [ ] **TD-03**: Google OAuth production redirect URLs verified end-to-end

## v3+ Requirements

Deferred beyond v2.0. Tracked but not in current roadmap.

### Scraping & Platform

- **SCRP-07**: FB Marketplace scraper (best-effort secondary source)
- **PLAT-01**: Native mobile app (App Store / Play Store)
- **FAV-04**: Edit/reorder favorites folders

### Monetization

- **MON-01**: Subscription / instant alerts paywall
- **MON-02**: Restore Purchase flow

## Out of Scope

| Feature | Reason |
|---------|--------|
| Subscription / Restore Purchase | v1/v2 principle: stay free unless explicitly opted in later |
| Snag red theme / floating capsule nav verbatim | Must follow Google Stitch design system |
| FB Marketplace scraper (SCRP-07) | v2+ backlog |
| Native app store packages (PLAT-01) | PWA-first validation continues |
| Rate App prompt | Not in v2.0 scope |
| In-app DM for scraped listings | v1 decision retained — deep-link to source |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 9 | Complete |
| NAV-02 | Phase 9 | Complete |
| NAV-03 | Phase 9 | Complete |
| NAV-04 | Phase 9 | Complete |
| HOME-01 | Phase 9 | Complete |
| HOME-02 | Phase 9 | Complete |
| HOME-03 | Phase 9 | Complete |
| FILT-01 | Phase 10 | Complete |
| FILT-02 | Phase 10 | Complete |
| FILT-03 | Phase 10 | Complete |
| FILT-04 | Phase 10 | Complete |
| FILT-05 | Phase 10 | Complete |
| CARD-01 | Phase 11 | Pending |
| CARD-02 | Phase 11 | Pending |
| CARD-03 | Phase 11 | Pending |
| CARD-04 | Phase 11 | Pending |
| CARD-05 | Phase 11 | Pending |
| FAV-01 | Phase 12 | Pending |
| FAV-02 | Phase 12 | Pending |
| FAV-03 | Phase 12 | Pending |
| LOC-01 | Phase 13 | Pending |
| LOC-02 | Phase 13 | Pending |
| LOC-03 | Phase 13 | Pending |
| SET-01 | Phase 14 | Pending |
| SET-02 | Phase 14 | Pending |
| SET-03 | Phase 14 | Pending |
| SET-04 | Phase 14 | Pending |
| SET-05 | Phase 14 | Pending |
| SET-06 | Phase 14 | Pending |
| I18N-01 | Phases 9–14 | Complete |
| TD-01 | Phase 14 | Pending |
| TD-02 | Phase 7 | Pending |
| TD-03 | Phase 7 | Pending |
| DEPLOY-01 | Phase 7 | Pending |
| DEPLOY-02 | Phase 7 | Pending |
| DEPLOY-03 | Phase 7 | Pending |
| DEPLOY-04 | Phase 7 | Pending |
| DEPLOY-05 | Phase 7 | Pending |

**Coverage:**

- v2.0 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-09*  
*Last updated: 2026-08-09 after v2.0 milestone init*
