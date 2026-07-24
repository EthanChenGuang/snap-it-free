# 手慢无 (ShouManWu) — Venice Free Finds

## What This Is

A free-item discovery app for Venice (Centro Storico, Mestre/Marghera, Lido/outer islands) that aggregates free listings scraped from Subito.it (primary) and Facebook Marketplace (secondary/stretch) into one map-first browsing experience, and lets users post their own free items directly (UGC / "street dump"). Built for international students (Ca' Foscari, IUAV), local residents, and expats — Italian as primary UI language, with English and Chinese toggles. Modeled on the Snag app's aggregation/map/alert mechanics, but staying fully free in v1 rather than paywalling the feed.

## Core Value

Users can find and claim real free items near them in Venice faster than by manually checking Subito/FB Marketplace/community groups themselves — validated by supply flow-through rate and user activity (MAU/retention), not revenue.

## Business Context

- **Customer**: No paying customer in v1 — free product for students/residents/expats
- **Revenue model**: None in v1; future subscription (instant alerts) and local ad partnerships considered post-validation
- **Success metric**: MAU, retention, and supply flow-through rate in the Venice market

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Map-first home screen with GPS pins for free items across Venice zones (Centro Storico / Mestre-Marghera / Lido-Murano), draggable bottom sheet list
- [ ] Subito.it scraper (Veneto/Venice free-item category), 1-2hr refresh cadence
- [ ] FB Marketplace scraper (stretch/secondary — best-effort given anti-bot defenses, don't block launch on it)
- [ ] 48-hour auto-expiry of scraped listings
- [ ] Community "claimed/expired" report button, auto-hide after 2 reports
- [ ] In-app WebView for scraped listings with top bar (favorite, share, back-to-list) — deep-links to source, no in-app contact for scraped listings
- [ ] UGC quick-post flow (photo + title + zone tag, under 30 seconds)
- [ ] "Street Dump" quick-pin posting mode
- [ ] In-app contact/DM + first-come-first-served + seller reserve/mark-as-sent toggle — for UGC posts only
- [ ] Login-optional browsing; login prompt only on contact-seller / enable-alerts / favorite / post actions (Google/Apple/email)
- [ ] Push notifications: keyword + zone match alerts
- [ ] i18n: Italian (primary), English, Chinese toggle

### Out of Scope

- Paywalling the live feed / subscription-gated browsing — deliberate divergence from Snag's monetization model, which drew heavy user backlash ("pay to find free stuff")
- In-app contact/DM for scraped (non-UGC) listings — deep-link to source instead; avoids building a parallel messaging system for content we don't control
- Scraping closed/login-walled Chinese community channels (WeChat groups, forums like 奋斗在意大利) — not realistically scrapable; served instead via Chinese-language UI on top of scraped Subito/FB inventory, with manual community seeding as a growth tactic
- Native mobile app (RN/Expo/Flutter) — deferred; v1 ships as a mobile-responsive web app (PWA) to skip app store review and validate faster
- Scraping specific closed Facebook groups (e.g. "Compro Vendo Usato Mestre Venezia e Dintorni") — v2 candidate, harder to scrape than Marketplace (membership/login walls)

## Context

- Modeled on Snag App (US): aggregates free listings from Facebook Marketplace/Craigslist/community boards into a map-based feed with alerts. Its "Snag it" button deep-links out to the source listing with no in-app contact flow, and the entire live feed is paywalled behind a subscription ($5.99-9.99/wk). This project copies the aggregation/UX mechanics but stays free in v1 — reviews of Snag show heavy backlash on the paywall undermining its "free stuff" premise, so staying free is also a differentiator.
- Facebook Marketplace scraping is legally contentious but not clearly illegal for logged-out public data (Meta v. Bright Data was decided in the scraper's favor on this point). Meta still actively cease-and-desists/sues, and FB Marketplace has strong technical anti-bot defenses (login walls, fingerprinting, rate limiting) that make sustained scraping operationally hard regardless of the legal question.
- Subito.it also actively blocks scrapers — needs careful rate limiting/proxy rotation within budget.
- Target users: Ca' Foscari/IUAV international students, local Venice/Mestre residents, expats — with a meaningful Chinese-student population driving the Chinese UI requirement.
- Venice's geography (bridges, walking-only Centro Storico) makes precise GPS pins and zone-based filtering (Centro Storico / Mestre-Marghera / Lido-Murano) especially important vs. a generic city app.

## Constraints

- **Budget**: $20-100/month for proxies, maps, hosting — must stay lean since there's no revenue in v1
- **Team**: Solo builder (+ AI assistance) — the ~4-week timeline is aspirational, not a hard deadline; scope may compress or extend
- **Tech/legal**: FB Marketplace and Subito.it both employ anti-scraping defenses — scraper reliability is a real risk to plan around, not assume away
- **Platform**: Ships as a mobile-responsive web app (PWA) first — no app store review dependency for v1 launch

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stay free in v1 instead of copying Snag's paywall | MVP goal is validating MAU/retention/supply flow, not revenue; Snag's paywall model draws heavy user backlash | — Pending |
| Keep UGC posting despite Snag being pure-aggregation | Venice is a small market; scraped supply alone may be too thin to sustain engagement | — Pending |
| Scraped listings deep-link out (no in-app contact); UGC gets in-app DM/reserve flow | Matches Snag's proven pattern for content we don't control; avoids building messaging for listings we don't own | — Pending |
| Subito.it as primary scraper target, FB Marketplace as stretch/secondary | Subito has a clearer free/regalo category and relatively fewer defenses than FB Marketplace; reduces v1 risk of scraper collapse before launch | — Pending |
| Ship as PWA/web app before native mobile | App store review cycles conflict with the "validate fast" MVP goal; native mobile deferred to post-validation | — Pending |
| Don't scrape closed Chinese community channels (WeChat/forums) | Not technically scrapable (login-walled, no API); served instead via Chinese-language UI over existing scraped inventory plus manual community seeding | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-24 after initialization*
