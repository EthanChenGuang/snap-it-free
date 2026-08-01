# Roadmap: 手慢无 (ShouManWu) — Venice Free Finds

## Overview

The journey starts underground: a resilient scraper pipeline pulls real free listings out of Subito.it into a canonical, zone-tagged data model before any UI exists, because a map with no pins is a broken first-run experience. Phase 2 puts that data in front of users as a map-first, login-optional browsing experience — the core "find free stuff faster" value proposition, deliverable end-to-end with scraped supply alone. Phase 3 adds the project's structural bet against thin scraped supply in a small market: UGC posting, in-app DM/reserve, and the moderation/safety mechanics that must ship alongside posting, not bolted on after an incident. Phase 4 layers in login-gated alerts and push notifications once both supply sources exist to test against, and Phase 5 closes with the trilingual UI that makes the whole app usable for Venice's international student and expat population.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Scraper Foundation & Listing Data Model** - Ingest, normalize, zone-tag, and validate free listings from Subito.it into a canonical schema (completed 2026-07-28)
- [x] **Phase 2: Map + List Core Browsing** - Users can find and explore live free listings across Venice, login-optional (completed 2026-07-28)
- [x] **Phase 3: UGC Posting & Community Marketplace** - Users can post their own free items and coordinate pickup in-app, safely (completed 2026-08-01)
- [ ] **Phase 4: Auth, Alerts & Push Notifications** - Users log in only when needed and get notified of new matching listings
- [ ] **Phase 5: Trilingual UI (Italian / English / Chinese)** - Users can use the entire app in their preferred language

## Phase Details

### Phase 1: Scraper Foundation & Listing Data Model

**Goal**: As a solo operator, I want to continuously ingest and normalize Subito.it free listings into a zone-tagged Supabase store, so that Phase 2 launches with real map pins instead of an empty feed.
**Mode**: mvp
**Depends on**: Nothing (first phase)
**Requirements**: SCRP-01, SCRP-02, SCRP-03, SCRP-05, SCRP-06
**Success Criteria** (what must be TRUE):

  1. New free listings from Subito.it's Veneto/Venice free-item category appear in the listing store within 1-2 hours of being posted
  2. Every stored listing carries a normalized source badge (`subito` / `facebook` / `ugc`) and a zone tag (Centro Storico / Mestre-Marghera / Lido-Murano) assigned automatically at ingestion
  3. Listings containing price or negotiation language are filtered out before reaching the listing store, instead of surfacing as false "free" items
  4. An operator is alerted when the scraper returns an empty, malformed, or suspiciously small feed (soft-block detection), instead of the failure going unnoticed

**Plans**: 4/4 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Supabase schema, Wave 0 tests, legal note, package scaffold

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Subito spike + end-to-end tracer (one listing → Supabase)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Free filter, zone tagging, normalize pipeline integration

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-04-PLAN.md — Batch validation, operator alerts, cron + Docker deploy

**UI hint**: yes

### Phase 2: Map + List Core Browsing

**Goal**: As a Venice resident or visitor, I want to find and explore live free listings across the city without needing an account, so that I can discover free items nearby and claim them on Subito.
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, SCRP-04
**Success Criteria** (what must be TRUE):

  1. User opens the app and sees a map with pins for all currently active free listings across Venice's zones
  2. User can drag up a bottom-sheet list view of the same listings alongside the map, and filter both by zone (Centro Storico / Mestre-Marghera / Lido-Murano)
  3. User can favorite a listing and open a scraped listing in an in-app WebView with favorite/share/back-to-list controls, then deep-link out to the original Subito post to claim it — with no in-app contact required
  4. User can do all of the above without creating an account
  5. Listings automatically disappear from the map/list 48 hours after they were posted

**Plans**: 4/4 plans executed

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Next.js tracer: Supabase RLS reads → MapLibre pins on `/` (DISC-01 partial, DISC-07, SCRP-04)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Bottom sheet, zone filter, map↔list sync, app shell chrome (DISC-01, DISC-02, DISC-03)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md — Scraped listing detail shell + Subito external claim (DISC-04, DISC-05)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-04-PLAN.md — localStorage favorites, /list & /favorites routes, stubs, poll refresh (DISC-06, DISC-07)

**UI hint**: yes

### Phase 3: UGC Posting & Community Marketplace

**Goal**: Users can supplement scraped supply by posting their own free items and coordinating pickup directly in-app, with moderation and safety built in from day one
**Mode**: mvp
**Depends on**: Phase 2
**Requirements**: UGC-01, UGC-02, UGC-03, UGC-04, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, MOD-01, MOD-02, MOD-03
**Success Criteria** (what must be TRUE):

  1. A logged-in user can post a free item with photo, title, and zone tag in under 30 seconds, or use "Street Dump" to drop a pin at their GPS location with a manual confirm/adjust step
  2. Uploaded photos have EXIF metadata stripped before being stored or displayed
  3. A logged-in user can message a UGC poster in-app (scraped listings excluded), and the poster can mark their own listing as reserved or sent/gone
  4. Both parties see an in-person meetup safety notice at first contact and inside the DM thread
  5. Any user can report a listing as claimed/expired/not-free; scraped listings auto-hide after 2 reports while UGC listings auto-hide after 3 reports into `pending_review`, and its poster can see that it's hidden pending review

**Plans**: 4/4 plans executed

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — Tracer: migration + auth cookies + Quick Post + UGC detail on map (UGC-01, UGC-03, UGC-04)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-02-PLAN.md — In-app DM + safety modal/banner (CONT-01, CONT-04, CONT-05)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03-03-PLAN.md — Community reports + auto-hide + owner hidden banner (MOD-01, MOD-02, MOD-03)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 03-04-PLAN.md — Street Dump + poster lifecycle + rate limits (UGC-02, CONT-02, CONT-03)

### Phase 4: Auth, Alerts & Push Notifications

**Goal**: Users log in only at the moment an action requires it, and get notified when new listings match what they're looking for
**Mode**: mvp
**Depends on**: Phase 3
**Requirements**: AUTH-01, AUTH-02, NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05
**Success Criteria** (what must be TRUE):

  1. A user is only prompted to log in (Google, Apple, or email) when they try to contact a seller, enable alerts, favorite, or post — never just to browse
  2. A logged-in user can create a keyword + zone alert and receives a push notification when a new listing matches it
  3. A user without push available (e.g. an iOS Safari tab that hasn't installed the app) still sees an in-app "new match" badge for alerts that fired
  4. An iOS user is walked through an explicit Add-to-Home-Screen onboarding flow, since push requires standalone install on iOS

**Plans**: 7/7 plans executed

Plans:
**Wave 0**

- [x] 04-01-PLAN.md — Migration 016 + VAPID/cron env + Wave 0 unit test scaffolds

**Wave 1** *(blocked on Wave 0 completion)*

- [x] 04-02-PLAN.md — Google/Apple OAuth in AuthPromptModal + Supabase dashboard setup (AUTH-01)

**Wave 2** *(blocked on Waves 0–1 completion)*

- [x] 04-03-PLAN.md — user_favorites API + localStorage merge + FavoriteButton auth gate (AUTH-02)

**Wave 3** *(blocked on Wave 1 completion)*

- [x] 04-04-PLAN.md — Alerts CRUD + Settings expansion Profile/Alerts (NOTF-01, NOTF-05)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 04-05-PLAN.md — listing_events trigger + cron matcher → alert_matches + BottomNav badge (NOTF-03)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 04-06-PLAN.md — Serwist SW + push_subscriptions + web-push in cron (NOTF-02)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 04-07-PLAN.md — iOS A2HS onboarding funnel + permission gates (NOTF-04)

### Phase 5: Trilingual UI (Italian / English / Chinese)

**Goal**: Users can use the entire app in their preferred language
**Mode**: mvp
**Depends on**: Phase 4
**Requirements**: I18N-01, I18N-02
**Success Criteria** (what must be TRUE):

  1. A user can switch the UI language between Italian (default), English, and Chinese from anywhere in the app, and the choice persists across sessions
  2. Every piece of user-facing UI chrome — navigation, forms, buttons, notifications, onboarding — is fully translated in all three languages

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scraper Foundation & Listing Data Model | 4/4 | Complete    | 2026-07-28 |
| 2. Map + List Core Browsing | 5/5 | Complete    | 2026-07-28 |
| 3. UGC Posting & Community Marketplace | 4/4 | Complete    | 2026-08-01 |
| 4. Auth, Alerts & Push Notifications | 7/7 | In Progress|  |
| 5. Trilingual UI (Italian / English / Chinese) | 0/TBD | Not started | - |

---
*Roadmap created: 2026-07-26*
