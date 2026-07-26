# Feature Research

**Domain:** Free-item discovery/aggregation app (hyperlocal marketplace utility, map + alerts)
**Researched:** 2026-07-26
**Confidence:** MEDIUM (cross-referenced App Store/Play Store listings, vendor sites, and review aggregation across 5+ competitor products; no first-party analytics or user interviews available — see Gaps)

## Feature Landscape

Surveyed products: **Snag** (US aggregator, paywalled — the explicit model for this project), **Buy Nothing Project / Trash Nothing** (pure-UGC gift economy, cross-community aggregation), **Freebie Alerts / AllFree** (lightweight scan-and-notify aggregators over FB Marketplace/Nextdoor/OfferUp/TrashNothing), **Curb Alert** (map-first curbside-claim app with "On My Way" mechanic). This category splits into two supply models — **pure aggregation** (Snag, Freebie Alerts) and **pure UGC** (Buy Nothing/Freecycle) — with almost no product combining both, which is the core structural bet of this project (per `PROJECT.md`: "Venice is a small market; scraped supply alone may be too thin").

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or, worse, feels broken/untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Map view with pins for nearby free items | Every competitor (Snag, Curb Alert) leads with "real-time map of free items near you" — it's the category's primary mental model, not a nice-to-have | MEDIUM | Already scoped as home screen in PROJECT.md; needs geocoding for scraped listings (Subito addresses often vague — may need centroid-of-zone fallback) |
| List/feed view alongside the map | Map-only browsing is unusable for scanning many items; every competitor pairs map with a scrollable feed | LOW | PROJECT.md already specifies draggable bottom sheet — matches category norm |
| Photo + short description per listing | Baseline trust signal; listings without photos get skipped or treated as spam across every reviewed product | LOW | Scraped listings inherit Subito photos; UGC posting must require at least one photo |
| Distance/zone filtering | Users won't scroll a citywide feed; Freebie Alerts, AllFree, Curb Alert, Snag all filter by radius/location | LOW–MEDIUM | Venice's Centro Storico/Mestre-Marghera/Lido-Murano zones are a stronger fit than a generic radius (bridges break "as the crow flies" distance) |
| Freshness signal / expiry of stale listings | The single most common complaint across every reviewed app (Snag reviews: "items disappeared," "nothing near me"; Trash Nothing reviews: high flake/no-show rate) is stale or already-gone listings eroding trust | MEDIUM | PROJECT.md's 48h auto-expiry + community "claimed/expired" report-to-hide directly targets this — correctly prioritized as table stakes, not nice-to-have |
| Push notifications / keyword or zone alerts | Freebie Alerts' entire value proposition is "get notified before anyone else"; Snag, AllFree, Trash Nothing all offer this | MEDIUM | PROJECT.md scopes keyword + zone match alerts — matches category baseline |
| One-tap path to claim/view source | Users expect a single tap from feed card to full listing detail or source; friction here is a top complaint (Snag's paywall friction) | LOW | In-app WebView for scraped listings satisfies this without building a redundant detail page |
| Favorite/save an item | Standard across marketplace-adjacent apps; lets users compare before committing | LOW | Already scoped in PROJECT.md WebView top bar |
| Login-optional browsing | Every reviewed competitor lets you browse before any account creation; forcing signup to browse is a known bounce driver (Snag's onboarding-gated paywall is the cautionary tale, not the model to copy) | LOW | PROJECT.md already scopes login only at contact/alert/favorite/post — correct |

### Differentiators (Competitive Advantage)

Features that set the product apart from the reviewed category. Should align with the Core Value ("find and claim real free items near them faster").

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Fully free live feed, no subscription paywall | Snag's paywall (browsing, search, and even clicking a listing require $5.99–24.99 subscription) is the single most-cited user complaint in its reviews ("the only thing between this and Facebook Marketplace is that you have to pay to find free stuff"). Staying free while copying Snag's UX mechanics directly converts Snag's biggest weakness into this product's core differentiator | LOW (product decision, not engineering) | Already the explicit strategic bet in PROJECT.md — validated by competitor review evidence, not just intuition |
| Dual supply: scraped aggregation + UGC in one map | No reviewed competitor combines both. Snag is aggregation-only (thin/stale supply risk, per its own reviews). Buy Nothing/Trash Nothing is UGC-only (depends entirely on community critical mass, which a small city like Venice may lack at launch). Blending both hedges the cold-start problem that sinks pure-UGC apps in small markets | HIGH | This is the structural bet noted in PROJECT.md's Key Decisions; UI must clearly distinguish scraped vs. UGC pins (source badge) so users calibrate trust/expectations differently for each |
| Venice-specific zone model (Centro Storico / Mestre-Marghera / Lido-Murano) instead of generic radius | Walking-only islands + bridges make straight-line radius filtering misleading (a pin "800m away" may be a 20-minute walk via bridges, or unreachable without a boat/bus). No reviewed competitor solves this — they're all built for drivable US suburbs | MEDIUM | Differentiator specifically because it's a geography no competitor was designed for; also functions as a trust builder ("this app actually understands Venice") |
| "Street Dump" quick-pin posting (photo + GPS drop, <30s) | Buy Nothing/Trash Nothing UGC posting requires a full form (title, description, category, location text). A sub-30-second photo+pin flow lowers the activation energy for spontaneous curbside posting (the exact "porch/curb" moment Trash Nothing relies on but doesn't optimize for speed) | MEDIUM | Feeds the aggregation+UGC hybrid bet — more UGC supply only happens if posting friction is near-zero |
| In-app DM + reserve/mark-as-sent for UGC only | Trash Nothing/Buy Nothing use "let it simmer" + giver discretion (deliberately anti-speed, values-driven). This project's FCFS + reserve toggle is faster and matches how Subito/marketplace users already expect claiming to work — a better fit for a "find stuff faster" value prop than a slower community-values model | MEDIUM | Scoping in-app contact to UGC-only (not scraped) avoids building messaging infra for content the product doesn't control — matches PROJECT.md's explicit rationale |
| Trilingual UI (Italian / English / Chinese) | None of the reviewed competitors offer non-English/non-local-language UI. A dedicated Chinese toggle directly serves a segment (Ca' Foscari/IUAV Chinese student population) that is otherwise only reachable via closed WeChat/forum channels this product can't scrape | LOW–MEDIUM | Functions as a growth/community-seeding lever, not just accessibility — per PROJECT.md's rationale for not scraping closed Chinese channels |
| In-app WebView (not raw redirect) for scraped listings | Keeps the user inside the product's shell (favorite/share/back-to-list persist) instead of ejecting to a browser tab like most aggregator apps (AllFree, Freebie Alerts just fire a notification/link out) | LOW–MEDIUM | Matches Snag's better UX instinct here while dropping the paywall Snag gates it behind |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this project's scope, budget, or positioning.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Paywalled/subscription-gated live feed | Obvious monetization path; Snag proves willingness to charge for this category | Snag's own reviews show this is the #1 driver of user rage and 1-star reviews ("false advertising," "pay to find free stuff") — directly undermines the "free stuff" premise and MVP goal (validate MAU/retention, not revenue) | Stay free in v1; revisit instant-alerts subscription or local ad partnerships only after MAU/retention is validated (already the PROJECT.md plan) |
| "Flip for profit" framing / reseller tooling | Snag markets itself this way ("flip free finds for profit," "win the free stuff game") — seems like it'd drive engagement | Attracts bulk-hoarding bot-like behavior that crowds out genuine need-based users, and undermines community goodwill this product depends on for UGC supply (posters won't donate to be flipped for profit) | Keep framing purely need/reuse-oriented; no in-app resale tools or profit messaging |
| In-app chat/DM for scraped (non-UGC) listings | Feels inconsistent to offer DM for UGC but not scraped items | Requires building and moderating a parallel messaging system for content on Subito/FB that this product doesn't own, can't verify, and can't guarantee still exists — high build cost for content you don't control (explicitly already excluded in PROJECT.md) | Deep-link to source listing on Subito/FB for contact; keep in-app DM exclusive to UGC |
| "Let it simmer" / giver-chooses-recipient claim model (Buy Nothing's model) | It's the values-driven, community-first approach used by the most established player in the free-gifting space | Adds latency and decision overhead exactly where this product's value prop is speed ("find and claim... faster"); also requires building a request/expression-of-interest UI more complex than FCFS-plus-reserve | Keep first-come-first-served + reserve/mark-as-sent for UGC, as already scoped |
| Social/gratitude layer (hearts, comments, "thank you" posts, follower graphs) | Buy Nothing's community feels warmer with this; could increase engagement/retention | Adds moderation surface and dev time without addressing the core discovery/speed value prop; risks becoming a second product (social network) instead of a utility (finder) | Keep interactions minimal: favorite, report, claim/reserve, DM — no public social graph in v1 |
| Native mobile app (iOS/Android) at launch | Feels more "real," push notifications are more reliable, better perceived polish | App store review cycles and dual-platform maintenance conflict directly with the "validate fast" MVP goal and solo-builder capacity; PWA covers push notifications adequately on Android and increasingly on iOS (Web Push) | Ship PWA first (already scoped); defer native to post-validation |
| Building a payment/checkout flow (like Curb Alert's paid "ASAP Pickup" tier) | Precedent exists in the category (Curb Alert monetizes paid pickups); could open a revenue path | Every listing in this product is free by definition — a payment flow contradicts the core value prop and adds PCI/payment-processing scope irrelevant to a $20–100/month budget | None needed; if monetization is explored post-validation, use ads/subscriptions, not per-item payments |
| Real-time push infrastructure for scraped listings | "Real-time" feels premium and matches Curb Alert's "live proximity feed" pitch | Scraper refresh cadence is 1–2 hours by design (rate-limit/anti-bot budget constraint) — building websocket/real-time infra for data that only actually changes hourly is wasted engineering effort | Poll-based refresh on the stated cadence; reserve true real-time push for UGC posts only, where it's cheap (a new row, not a scrape cycle) |

## Feature Dependencies

```
Scraper pipeline (Subito, geocoded)
    └──requires──> Listing data model (status: active/claimed/expired, source badge)
                       └──enables──> Map-first home screen (pins)
                       └──enables──> 48h auto-expiry job
                       └──enables──> Community claimed/expired report button (needs report-count field)
                       └──enables──> In-app WebView (needs source URL captured at scrape time)

UGC quick-post flow (photo + title + zone)
    └──requires──> Listing data model (shared schema with scraped, source = "user")
    └──enables──> "Street Dump" quick-pin mode (lighter-weight variant of the same flow)
    └──requires──> Login (deferred to point-of-post, per login-optional browsing)
    └──enables──> In-app DM + reserve/mark-as-sent (UGC-only — requires two logged-in parties)

Push notifications (keyword + zone alerts)
    └──requires──> Listing data model (both scraped and UGC feed into the same alert matcher)
    └──requires──> Login (to persist alert preferences) — but browsing without alerts stays login-optional

i18n (IT/EN/ZH toggle)
    └──enhances──> every user-facing feature above (does not block any of them; can ship incrementally, e.g. IT+EN at launch, ZH shortly after)

Zone-based filtering (Centro Storico / Mestre-Marghera / Lido-Murano)
    └──enhances──> Map-first home screen and Push notifications (zone match alerts depend on this taxonomy existing first)

FB Marketplace scraper (stretch)
    └──conflicts with──> launch-blocking priority (explicitly scoped as best-effort, not blocking v1 per PROJECT.md)
```

### Dependency Notes

- **Map-first home screen requires the scraper pipeline (or UGC posts) to exist first:** a map with no pins is a broken first-run experience — sequencing matters for what ships in week 1 of a phase vs. later.
- **Push notifications require the listing data model and zone taxonomy to be finalized first:** alert matching logic (keyword + zone) needs a stable schema; building this before the data model settles risks rework.
- **In-app DM/reserve requires login and is UGC-only:** this is a hard boundary, not just a sequencing note — scraped listings must never expose an in-app contact affordance, since PROJECT.md deliberately excludes building messaging for content off-platform doesn't control.
- **"Street Dump" enhances (is a lighter mode of) the general UGC quick-post flow, not a separate feature:** build the general flow's data model first, then add the fast-path UI on top — don't build two parallel posting pipelines.
- **i18n is additive, not a dependency of anything:** it can and should be sequenced after the core interaction flows are stable, shipping IT+EN before ZH if time-boxed, without blocking any other feature.

## MVP Definition

### Launch With (v1)

Minimum viable product — matches PROJECT.md's "Active" requirements list; validated against competitor research as the correct scope (no missing table stakes identified, no excess differentiators added).

- [ ] Map-first home screen (zone-based pins) + draggable bottom-sheet list — table stakes, unmet elsewhere means no core value
- [ ] Subito.it scraper (free-item category, 1–2hr refresh) — the primary supply source; without it there's no aggregation product
- [ ] 48-hour auto-expiry + community claimed/expired report (auto-hide at 2 reports) — directly addresses the #1 category-wide complaint (stale listings)
- [ ] In-app WebView for scraped listings (favorite/share/back, deep-link to source, no in-app contact) — needed so scraped content doesn't require building unowned-content messaging
- [ ] UGC quick-post (photo + title + zone, <30s) + "Street Dump" pin mode — the hedge against thin scraped supply in a small market
- [ ] In-app DM + FCFS + reserve/mark-as-sent (UGC only) — enables the UGC side to actually close loops, not just list
- [ ] Login-optional browsing, login only at contact/alert/favorite/post — removes the #1 friction point competitors get wrong (Snag's forced paywall/signup)
- [ ] Push notifications (keyword + zone) — table stakes for a "beat everyone else to it" value prop
- [ ] i18n: Italian, English, Chinese toggle — differentiator that's cheap relative to its community-seeding value

### Add After Validation (v1.x)

Features to add once core aggregation+UGC loop is proven (MAU/retention/supply-flow signal positive).

- [ ] FB Marketplace scraper (stretch, best-effort) — trigger: Subito supply alone proves insufficient, or scraper survives budget/anti-bot cost in testing
- [ ] Instant-alerts subscription tier — trigger: retained user base exists to monetize without repeating Snag's mistake of gating the whole feed (gate speed/priority only, never basic access)
- [ ] Local ad partnerships — trigger: MAU large enough to be worth a local business's spend
- [ ] Scraping specific closed FB groups (e.g. "Compro Vendo Usato Mestre Venezia e Dintorni") — trigger: FB Marketplace scraping proves viable first (harder target, login/membership-walled)

### Future Consideration (v2+)

Features to defer until product-market fit is established in the Venice market.

- [ ] Native mobile app (RN/Expo/Flutter) — defer: app store review cycles conflict with "validate fast"; PWA push notifications are sufficient for MVP validation
- [ ] Manual Chinese-community seeding partnerships (WeChat/forum outreach, not scraping) — defer: growth-tactic layer on top of a proven core product, not core product itself
- [ ] Trust/reputation scoring for UGC posters — defer: only becomes necessary once UGC volume is high enough for spam/bad-actor patterns to emerge

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Map-first home + zone filtering | HIGH | MEDIUM | P1 |
| Subito scraper + 48h expiry + report-to-hide | HIGH | HIGH | P1 |
| In-app WebView for scraped listings | MEDIUM | LOW | P1 |
| UGC quick-post + Street Dump | HIGH | MEDIUM | P1 |
| In-app DM/reserve (UGC only) | HIGH | MEDIUM | P1 |
| Login-optional browsing | HIGH | LOW | P1 |
| Push notifications (keyword + zone) | HIGH | MEDIUM | P1 |
| i18n (IT/EN/ZH) | MEDIUM | LOW–MEDIUM | P1 |
| FB Marketplace scraper | MEDIUM | HIGH | P2 |
| Instant-alerts subscription tier | LOW (pre-validation) | MEDIUM | P3 |
| Local ad partnerships | LOW (pre-validation) | LOW | P3 |
| Native mobile app | MEDIUM | HIGH | P3 |
| Reputation/trust scoring | LOW (pre-scale) | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Snag (US) | Buy Nothing / Trash Nothing | ShouManWu (Venice) Approach |
|---------|-----------|------------------------------|------------------------------|
| Supply source | Scraped aggregation only (FB Marketplace, Craigslist, OfferUp) | Pure UGC only | Both: scraped (Subito, FB stretch) + UGC — hedges thin supply in a small market |
| Access model | Entire feed/interactions paywalled ($5.99–24.99) | Always free (paid tier only unlocks extras: private communities, bookmarks, wider radius) | Always free in v1 — no paywall on browsing, search, or claiming |
| Claim mechanic | Deep-link out to source ("Snag it" button); no in-app claim | "Interested" + comment, giver chooses recipient after a simmer window (not FCFS) | FCFS + reserve/mark-as-sent for UGC; deep-link out (no in-app claim) for scraped |
| Messaging | None in-app (redirects to source platform) | In-app messaging, no exposed contact info | In-app DM for UGC only; deep-link to source for scraped (no parallel messaging for unowned content) |
| Freshness handling | Frequent complaints of stale/gone listings; no visible community-report mechanism | Manual mark-as-gifted by poster; auto-withdraw reminder emails if no reply | 48h auto-expiry (scraped) + community report-to-hide at 2 reports — proactive vs. both competitors' reactive/manual approach |
| Geography model | Generic radius/distance filter | Generic radius/distance filter | Venice zone taxonomy (Centro Storico / Mestre-Marghera / Lido-Murano) — accounts for walking-only islands and bridges |
| Language | English only | English only (Freegle/Trash Nothing regional variants exist but no true multi-toggle) | Italian (primary), English, Chinese toggle |
| Alerts | Instant alerts (paid feature only) | None built-in (third-party apps like Freebie Alerts fill this gap externally) | Keyword + zone alerts, free, built-in |

## Sources

- Snag ("Zero Dollar Items") — App Store listings (US/UK), MWM app data aggregator, AppRecs review analysis — cross-referenced across 4 independent listings/review sources (MEDIUM confidence: consistent feature descriptions and paywall complaints across all sources)
- The Buy Nothing Project — official site, quickstart guide, Help Center article on gifting mechanics, Google Play listing (MEDIUM confidence: official first-party documentation, cross-checked against Play Store description)
- Trash Nothing — official site, Help Center "how it works," App Store/Play Store listings, third-party "best free stuff apps" comparison guide (MEDIUM confidence: official + third-party comparison agree on mechanics; Play Store reviews independently corroborate the flake/no-show pitfall)
- Freebie Alerts, AllFree — vendor sites and Google Play listings (MEDIUM confidence: vendor-authored, directionally consistent with Trash Nothing/Snag category norms but not independently reviewed in depth)
- Curb Alert — vendor site (MEDIUM-LOW confidence: single-source, no independent reviews found; feature claims not cross-verified)
- Marketplace scam/safety patterns — cross-referenced across 4 independent scam-guide sources (isthisascam.to, listing-forge, thefraudcodex, dealhunter) with consistent findings on off-platform-redirect and fake-listing patterns (MEDIUM confidence)
- Project context: `/home/guang/Projects/Experiments/shou-man-wu/.planning/PROJECT.md` (primary source for existing scope decisions and rationale)

## Gaps to Address

- No first-party usage data, app-store rating breakdowns by feature, or user interviews were available — all findings are inferred from public app-store copy and review text, not from controlled competitive testing.
- Could not verify current Subito.it "regalo/free" category structure or FB Marketplace free-section UI directly (would require live scraping/browsing, out of scope for this research pass) — worth a phase-specific spike before scraper implementation.
- Curb Alert's actual feature claims are single-sourced (vendor site only); treat its "On My Way" claim mechanic as a promising pattern to validate, not a proven one.
- No direct evidence on Venice-market-specific user behavior (e.g., actual willingness to walk across bridges for an item, actual FB group activity levels in Venice specifically) — flagged for phase-specific research or a soft launch survey rather than assumed here.

---
*Feature research for: Free-item discovery/aggregation app (Venice PWA)*
*Researched: 2026-07-26*
