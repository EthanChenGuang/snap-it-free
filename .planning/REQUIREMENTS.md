# Requirements: 手慢无 (ShouManWu) — Venice Free Finds

**Defined:** 2026-07-26
**Core Value:** Users can find and claim real free items near them in Venice faster than by manually checking Subito/FB Marketplace/community groups themselves.

## v1 Requirements

### Discovery & Map

- [x] **DISC-01**: User can browse a map-first home screen with pins for active free listings
- [x] **DISC-02**: User can view listings in a draggable bottom-sheet list alongside the map
- [x] **DISC-03**: User can filter listings by Venice zone (Centro Storico / Mestre-Marghera / Lido-Murano)
- [x] **DISC-04**: User can open a scraped listing in an in-app WebView with favorite, share, and back-to-list controls
- [x] **DISC-05**: User can deep-link from a scraped listing to the original source (Subito/FB) without in-app contact for scraped content
- [x] **DISC-06**: User can favorite a listing without leaving the browsing flow
- [x] **DISC-07**: User can browse listings without creating an account (login-optional browsing)

### Scraped Supply

- [x] **SCRP-01**: System ingests free listings from Subito.it (Veneto/Venice free-item category) on a 1–2 hour refresh cadence
- [x] **SCRP-02**: System normalizes scraped listings into a canonical schema with source badge (`subito`, `facebook`, `ugc`)
- [x] **SCRP-03**: System assigns zone tags to listings at ingestion via point-in-polygon (not live radius queries)
- [x] **SCRP-04**: System auto-expires scraped listings after 48 hours
- [x] **SCRP-05**: System filters out mislabeled "free" listings (price/negotiation language) at ingestion
- [x] **SCRP-06**: System validates scraper output shape and alerts on soft-block / empty-feed failures

### UGC Posting

- [x] **UGC-01**: User can post a free item with photo, title, and zone tag in under 30 seconds
- [x] **UGC-02**: User can use "Street Dump" quick-pin mode to drop a listing at their GPS location with manual confirm/adjust
- [x] **UGC-03**: System strips EXIF metadata from uploaded UGC photos
- [x] **UGC-04**: User must be logged in to post a listing

### UGC Contact & Claims

- [x] **CONT-01**: User can contact a UGC poster via in-app DM (UGC listings only)
- [x] **CONT-02**: UGC poster can mark a listing as reserved
- [x] **CONT-03**: UGC poster can mark a listing as sent/gone
- [x] **CONT-04**: User must be logged in to initiate contact on a UGC listing
- [x] **CONT-05**: System shows in-person meetup safety messaging at first contact and in DM threads

### Moderation & Trust

- [x] **MOD-01**: User can report a listing as claimed/expired or not actually free
- [x] **MOD-02**: System auto-hides a listing after 2 community reports (with UGC vs scraped threshold distinction)
- [x] **MOD-03**: UGC poster can see when their listing is hidden pending review

### Auth

- [x] **AUTH-01**: User can sign in with Google, Apple, or email when an action requires login
- [x] **AUTH-02**: User is prompted to log in only at contact-seller, enable-alerts, favorite, or post actions

### Notifications

- [x] **NOTF-01**: User can create keyword + zone match alerts
- [ ] **NOTF-02**: User receives push notifications when new listings match saved alerts (Web Push / VAPID)
- [x] **NOTF-03**: User sees an in-app "new match" badge fallback when push is unavailable (e.g. iOS Safari tab)
- [ ] **NOTF-04**: User sees an explicit Add-to-Home-Screen onboarding flow for iOS PWA install
- [x] **NOTF-05**: User must be logged in to create or manage alerts

### Internationalization

- [ ] **I18N-01**: User can switch UI language between Italian (default), English, and Chinese
- [ ] **I18N-02**: All user-facing UI chrome is translated in all three languages

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Scraped Supply

- **SCRP-07**: FB Marketplace scraper (best-effort, secondary source)
- **SCRP-08**: Scraping specific closed Facebook groups (membership/login-walled)

### Monetization

- **MON-01**: Instant-alerts subscription tier (speed/priority only, never gating basic feed access)
- **MON-02**: Local ad partnerships

### Platform

- **PLAT-01**: Native mobile app (iOS/Android)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Paywalling the live feed / subscription-gated browsing | Deliberate divergence from Snag; undermines "free stuff" premise and MVP validation goal |
| In-app contact/DM for scraped listings | Deep-link to source instead; avoids messaging infra for content we don't control |
| Scraping closed Chinese community channels (WeChat, forums) | Not technically scrapable; served via Chinese UI over scraped inventory + manual seeding |
| Native mobile app at launch | PWA validates faster; app store review deferred |
| Real-time push for hourly-scraped data | Scraper cadence is 1–2hr; poll-based refresh sufficient |
| Social graph (followers, public comments, gratitude posts) | Out of utility scope; adds moderation surface without core discovery value |
| Payment/checkout flow | All listings are free by definition |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCRP-01 | Phase 1 | Complete |
| SCRP-02 | Phase 1 | Complete |
| SCRP-03 | Phase 1 | Complete |
| SCRP-05 | Phase 1 | Complete |
| SCRP-06 | Phase 1 | Complete |
| DISC-01 | Phase 2 | Complete |
| DISC-02 | Phase 2 | Complete |
| DISC-03 | Phase 2 | Complete |
| DISC-04 | Phase 2 | Complete |
| DISC-05 | Phase 2 | Complete |
| DISC-06 | Phase 2 | Complete |
| DISC-07 | Phase 2 | Complete |
| SCRP-04 | Phase 2 | Complete |
| UGC-01 | Phase 3 | Complete |
| UGC-02 | Phase 3 | Complete |
| UGC-03 | Phase 3 | Complete |
| UGC-04 | Phase 3 | Complete |
| CONT-01 | Phase 3 | Complete |
| CONT-02 | Phase 3 | Complete |
| CONT-03 | Phase 3 | Complete |
| CONT-04 | Phase 3 | Complete |
| CONT-05 | Phase 3 | Complete |
| MOD-01 | Phase 3 | Complete |
| MOD-02 | Phase 3 | Complete |
| MOD-03 | Phase 3 | Complete |
| AUTH-01 | Phase 4 | Complete |
| AUTH-02 | Phase 4 | Complete |
| NOTF-01 | Phase 4 | Complete |
| NOTF-02 | Phase 4 | Pending |
| NOTF-03 | Phase 4 | Complete |
| NOTF-04 | Phase 4 | Pending |
| NOTF-05 | Phase 4 | Complete |
| I18N-01 | Phase 5 | Pending |
| I18N-02 | Phase 5 | Pending |

**Coverage:**

- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0 ✓

*Note: corrected from an earlier preliminary count of 32 during roadmap finalization — the traceability table above always listed all 34 v1 requirement IDs; only the summary count was off.*

---
*Requirements defined: 2026-07-26*
*Last updated: 2026-07-26 after roadmap finalization*
