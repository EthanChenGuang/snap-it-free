# Pitfalls Research

**Domain:** Free-item discovery PWA — scraper-heavy map aggregator + UGC marketplace (Venice, Italy)
**Researched:** 2026-07-26
**Confidence:** MEDIUM-HIGH (scraper/legal/PWA findings verified against primary sources; UX/behavioral findings drawn from cross-referenced community reports)

## Critical Pitfalls

### Pitfall 1: Building on a scraper target that explicitly forbids scraping

**What goes wrong:**
Subito.it's own `robots.txt` states, in plain language: *"It is expressively forbidden to use search robots or other automatic methods to access Subito.it. Only if Subito.it has given such permission can be accepted."* This isn't a soft crawl-delay directive — it's an explicit prohibition, layered on top of standard `Disallow` rules for listing/pagination/user-profile paths. Teams often treat `robots.txt` as a technical suggestion rather than the site owner's stated legal position, then discover mid-build that their entire primary data source is adversarial by design, not just technically defended.

**Why it happens:**
Founders validate "is this scrapable?" by checking if a proof-of-concept scraper *works* (fetches a page, parses HTML) rather than checking what the target site's terms and `robots.txt` actually say. Technical feasibility and legal/ToS permissibility are conflated.

**How to avoid:**
- Read Subito.it's full Terms of Service (not just `robots.txt`) before committing engineering time — confirm whether personal/business use, non-commercial aggregation, or "public data" carve-outs exist.
- Budget for the likely outcome: sustained scraping will draw cease-and-desist correspondence or IP/account bans regardless of the Meta v. Bright Data precedent (that case only narrowly addressed logged-out public-data breach-of-contract claims for Meta, not Subito, and Subito's `robots.txt` is a more explicit prohibition than Meta's ToS language).
- Have a fallback data-acquisition plan (RSS/partner feed inquiry, manual seeding, user-submitted "found it on Subito" cross-posting) that doesn't depend on scraping surviving indefinitely.
- Treat scraper uptime as a product risk to be disclosed internally, not an assumed constant.

**Warning signs:**
- Scraper success rate drops without a corresponding site-wide outage (soft block, not a real outage).
- Increasing 403/429 rates or CAPTCHA challenges on previously-reliable endpoints.
- Any direct email/legal contact from Subito.it or its counsel.

**Phase to address:**
Scraper foundation / data-ingestion phase — before any UI is built on top of scraped data, since the entire aggregation value proposition depends on this pipeline's legal and operational durability.

---

### Pitfall 2: Soft blocks silently corrupting the feed instead of failing loudly

**What goes wrong:**
Anti-bot systems (used by both Subito and Facebook) increasingly return HTTP 200 with empty, truncated, or stale content instead of a clean 403/429. A naive scraper treats "200 OK" as success, writes garbage or zero new listings to the database, and the app silently shows a stale or empty map for hours before anyone notices — devastating for a "find free stuff fast" value proposition where freshness is the entire point.

**Why it happens:**
Scrapers are typically monitored by HTTP status code alone. Soft blocks are specifically designed to avoid tripping that alarm.

**How to avoid:**
- Validate scraped output shape, not just HTTP status: assert a minimum listing count per run, check that known-good selectors still resolve, and flag when a run returns suspiciously fewer results than the trailing average.
- Run a small, frequent "canary" scrape against a known-stable query/category before trusting a full run.
- Fail loudly (alert via Telegram/email/Slack — solo-builder-appropriate) rather than silently persisting empty/malformed batches.

**Warning signs:**
- Listing count per scrape cycle drops sharply without a matching drop in Subito's real ad volume.
- User reports of "nothing new" despite the scraper "running successfully" in logs.

**Phase to address:**
Scraper foundation phase (build the validation/alerting harness alongside the scraper itself, not as an afterthought).

---

### Pitfall 3: Scraper selector drift becomes a permanent, uncapped maintenance tax

**What goes wrong:**
Site redesigns (even small class-name or DOM structure changes) silently break extraction logic. Solo builders who scrape multiple sources report spending recurring multi-hour blocks "fixing broken scrapers" indefinitely, often disabling sources entirely once the fix cost exceeds the value of the data — a real risk for a project already treating FB Marketplace as best-effort/stretch.

**Why it happens:**
Extraction logic is typically hard-coded against brittle presentation selectors (specific CSS classes) rather than stable structural anchors (ARIA roles, data attributes, DOM hierarchy), and infrastructure (proxy/session handling) is tangled with extraction logic so every fix requires re-testing the whole pipeline.

**How to avoid:**
- Separate "infrastructure" (fetching, proxy rotation, retries) from "extraction" (parsing) so a selector fix is a small, isolated, quickly-testable change.
- Anchor selectors on structural/semantic attributes where possible, with a fallback chain rather than a single brittle selector.
- Accept and budget for this as an ongoing operational cost, not a one-time build item — for a solo builder, this is the single biggest hidden time sink in scraper-dependent products.

**Warning signs:**
- Any unexplained drop in extracted field completeness (e.g., titles present but photos/prices missing).
- Increasing time-per-week spent on scraper repair relative to feature work.

**Phase to address:**
Scraper foundation phase for the initial separation of concerns; ongoing maintenance budget should be explicitly reserved in every phase after launch.

---

### Pitfall 4: Scraped "free" listings that aren't actually free (bait/mislabeled ads)

**What goes wrong:**
Classifieds categories for free items are polluted with negotiable-price listings ("trattativa privata"/"prezzo da concordare"), listings that got re-priced after posting, or outright bait ads designed to funnel contacts. Snag (the model for this app) draws its single most damaging user complaints from exactly this: users pay/engage expecting free items and find "NOT FREE" or negotiate-required listings dominating the feed. For a product whose entire differentiation from Snag is staying free and trustworthy, importing this exact failure mode via unfiltered aggregation would be an unforced, reputation-defining error.

**Why it happens:**
Category-based scraping (pulling everything tagged "free"/"regalo") is far easier to build than content-based verification, so it's the default first implementation — and the failure only becomes visible once real users start clicking through.

**How to avoid:**
- Parse listing price/title/description for negotiation language and non-zero prices at ingestion time, not just category tag; drop or flag ambiguous listings rather than surfacing them as confirmed-free.
- Surface a lightweight "reported not free" community signal (reusing the existing claimed/expired report mechanic) with a lower threshold or distinct label than generic expiry.
- Track false-free rate as a launch metric — this directly measures whether the product's core promise ("faster than checking Subito yourself") is actually being kept.

**Warning signs:**
- User reports clustering around "not actually free" rather than "already claimed."
- Click-through-to-source rate high but return/retention low (people bounce off bad listings).

**Phase to address:**
Scraper/ingestion phase (filtering logic) and map/browse phase (report mechanic UI) jointly — this is a cross-cutting trust issue, not a single-phase feature.

---

### Pitfall 5: iOS push notifications silently don't work the way the requirement assumes

**What goes wrong:**
The active requirements list "push notifications: keyword + zone match alerts" as a straightforward feature, but on iOS this is gated behind a multi-step, non-obvious funnel: the PWA must be added to the Home Screen manually (no automatic install prompt exists — Apple doesn't implement `beforeinstallprompt`), opened from the Home Screen icon (not from a Safari tab, where `PushManager` is absent entirely), and only then can permission be requested via direct user interaction. On top of this, as of recent iOS/EU regulatory changes, some EU regions can see PWAs open in a normal Safari tab instead of standalone mode, which disables push entirely and applies a 7-day cache-eviction policy for inactive web apps — a real risk for an EU-market (Venice/Italy) launch specifically. Net effect: the realistically reachable push audience on iOS is roughly 10-15x smaller than a native app's, even before accounting for the ~16% opt-in rate on prompts users do see.
The Chinese-student segment is disproportionately iPhone-heavy in practice, meaning this limitation lands hardest on the exact underserved audience the Chinese-language UI is meant to serve.

**Why it happens:**
Push notifications "just work" on Android/desktop Chrome, so the iOS-specific install-and-permission funnel isn't discovered until iOS testing — often late, since it requires physical device testing (the iOS Simulator doesn't support web push at all).

**How to avoid:**
- Treat "get the user to Add to Home Screen" as its own onboarding funnel with an explicit, illustrated in-app prompt (share-icon animation) rather than assuming discovery — this is the single highest-leverage lever available on iOS.
- Test push end-to-end on a real iPhone early, not just Android/desktop — the Simulator will give false confidence.
- Design the notification feature with graceful degradation: users who never install to Home Screen should still get value from in-app "new match" badges/lists, not a dead feature.
- Explicitly monitor Home-Screen-install rate and push-opt-in rate as separate funnel metrics from day one, since "we shipped push" doesn't mean "iOS users receive push."

**Warning signs:**
- Push delivery/opt-in metrics dramatically lower on iOS than Android in early usage data.
- Support questions like "I never get notifications" concentrated among iPhone users specifically.

**Phase to address:**
PWA/notifications phase — should include an explicit "Add to Home Screen" onboarding flow as a first-class deliverable, not a footnote to the push feature.

---

### Pitfall 6: Community report/auto-hide mechanic is gameable by design

**What goes wrong:**
The spec'd mechanic — "auto-hide after 2 reports" — is a very low threshold that platforms in adjacent domains (game chat moderation, review systems) have found is trivially weaponized: a small number of coordinated or even just casual false reports (competitors hiding UGC listings, minor personal disputes, mis-clicks) can silently remove legitimate content with no review step. In a thin-supply market like Venice, losing even a handful of legitimate free-item listings to false reports meaningfully damages the already-scarce inventory the product depends on.

**Why it happens:**
Low thresholds are attractive because they keep the moderation system fully automated (no human review needed) and feel "safe" against genuinely stale listings — but the same low threshold that quickly clears real problems also makes malicious removal cheap.

**How to avoid:**
- Distinguish UGC listings (posted by an identifiable, potentially reachable user) from scraped listings when applying the 2-report threshold — UGC content, where a false takedown harms a real poster's ability to give something away, may warrant either a higher threshold or a "hidden pending review" state rather than instant removal.
- Log report source (rough account/device identity) even in an anonymous-browsing product, so repeated reports from the same actor against the same poster can be rate-limited or discounted.
- Give posters a lightweight way to see their item was hidden and contest it, rather than silent removal.

**Warning signs:**
- A poster's listings get hidden unusually fast relative to view count.
- Reports cluster from a small set of repeat reporters against a small set of repeat posters.

**Phase to address:**
UGC posting / trust & safety phase — the report threshold and reviewability should be designed together with the posting flow, not bolted on afterward.

---

### Pitfall 7: In-person exchange safety has no owner in the current spec

**What goes wrong:**
UGC posts get in-app DM + first-come-first-served + reserve/mark-as-sent — i.e., the product actively brokers real-world, in-person meetups between strangers to exchange physical goods, often at a stated pickup location (a "Street Dump" pin is explicitly a location-revealing feature). Marketplace apps with this exact mechanic (OfferUp, Facebook Marketplace) treat in-person-meetup safety guidance as a first-class, prominently surfaced feature (public/well-lit meeting spot suggestions, keeping contact in-app, warning against off-platform payment requests) precisely because the failure mode — a bad-actor meetup — is severe and reputationally catastrophic, not merely inconvenient. Nothing in the current requirements addresses this.

**Why it happens:**
Safety UX is invisible until an incident happens, so it's easy to deprioritize behind visible features (map, posting flow, alerts) that demo well.

**How to avoid:**
- Add lightweight, low-cost safety surfacing at the exact moments of highest risk: before first contact ("meet in a public, well-lit place"), and in the DM thread itself.
- Keep all contact in-app (already the plan) — explicitly warn against sharing phone numbers/addresses or moving off-platform, since that's the most common precursor to scams in comparable products.
- Since items are physical and often bulky (furniture, etc.), addresses/pickup points are frequently revealed anyway — consider a "safe meetup point" suggestion feature (e.g., a well-known public zone landmark) as a differentiator, especially relevant to Venice's compact, pedestrian geography.

**Warning signs:**
- Any user report involving a meetup that didn't happen as described, or felt unsafe.
- Complaints about home addresses being exposed via Street Dump pins.

**Phase to address:**
UGC posting / in-app contact phase — should ship alongside the DM/reserve flow, not after.

---

### Pitfall 8: GPS/location behavior degrades in exactly the geography this app targets

**What goes wrong:**
Venice's Centro Storico is a dense, narrow, canal-laced pedestrian environment — the urban-canyon multipath conditions that cause "wrong side of the street" or "wrong city block" GPS errors on generic map apps are structurally similar to (and in the canal/bridge case, arguably worse than) the skyscraper canyons this problem is best documented in. A pin placed a building-width off, or on the wrong side of a canal, is not a cosmetic bug in this app — Venice has no vehicle shortcuts, so a wrong pin can mean a genuinely different multi-minute walking route across a different bridge.

**Why it happens:**
Standard map/pin implementations trust raw device GPS coordinates without accounting for the specific failure mode of the deployment environment, since most map apps are built and tested in less GPS-hostile suburban/grid-street environments.

**How to avoid:**
- Use platform fused/high-accuracy location APIs (not raw GPS) and account for degraded accuracy explicitly in the UI (e.g., an accuracy-radius indicator on the pin) rather than presenting a single precise point as ground truth.
- For UGC "Street Dump" posts, let users confirm/drag-adjust the pin against the map rather than trusting auto-placement — a cheap mitigation that also matters for indoor/near-water posting where GPS lock is weakest.
- Snap zone classification (Centro Storico / Mestre-Marghera / Lido-Murano) to a curated polygon boundary rather than naive lat/long midpoints, since raw drift near zone borders (e.g., near the bridge connecting Mestre to Centro Storico) could misclassify items into the wrong zone filter.

**Warning signs:**
- User complaints that pins are "on the wrong island" or across a canal from the real location.
- Zone-filtered results missing items that are visibly nearby on the unfiltered map.

**Phase to address:**
Map/browse phase (pin accuracy handling) and UGC posting phase (manual pin confirmation) jointly.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Single-IP scraper with no proxy rotation | Zero proxy budget spent, fastest to ship | Near-certain IP ban within days of real usage; total pipeline outage | Local dev/testing only — never in any environment hitting production traffic patterns |
| Category-tag-only "free" filtering (no price/text validation) | Ships the aggregation feature in hours, not days | Imports Snag's exact "not actually free" trust failure into the core feed | Never past initial internal demo |
| Hard-coded CSS-class selectors, no fallback chain | Fastest initial scraper build | Every site redesign is a full outage until manually fixed | MVP only, with an explicit ticket to add structural fallback anchors before public launch |
| No listing-shape validation on scrape success (status-code-only monitoring) | Simpler scraper harness | Soft blocks silently corrupt the feed for hours/days undetected | Never — the cost to add is small relative to the risk |
| Treating scraped-listing GPS as exact without accuracy handling | Simpler map pin rendering | Systematically wrong pins in the exact dense urban environment this app targets | Never for Centro Storico; marginally more acceptable in flatter Mestre/Marghera grid streets |
| Auto-hide-at-2-reports with no distinction between scraped/UGC content | Simple, fully automated moderation | Cheaply weaponizable against real UGC posters in a thin-supply market | Acceptable for scraped listings only, never for UGC without a higher bar or review step |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Subito.it scraping | Treating `robots.txt`'s explicit "forbidden" language as a soft technical hurdle to route around with better anti-detection tooling | Read the full ToS, plan for sustained adversarial response (rate limits, IP/session bans, possible legal contact), and keep a non-scraping fallback for supply |
| Facebook Marketplace scraping | Assuming Meta v. Bright Data (2024) makes FB Marketplace scraping "settled legal" | That ruling addressed only Meta's *breach of contract* theory for *logged-out* public data in a narrow procedural posture (Meta later dropped remaining claims); Meta's technical anti-bot defenses (login walls, fingerprinting) remain a fully separate, much larger operational blocker regardless of the legal question |
| iOS Web Push (Push API) | Building/testing push only against Android/desktop Chrome, assuming iOS Safari behaves the same | Test push on a real iPhone via the Home-Screen-installed PWA specifically (not Safari tab, not Simulator); build an explicit Add-to-Home-Screen education flow |
| GDPR / scraped personal data | Re-publishing scraped seller phone numbers, names, or exact addresses without a documented legal basis | Since scraped listings deep-link to source rather than exposing in-app contact (per current scope), avoid persisting/displaying any personal data beyond what's needed for the map pin + deep link; document the legitimate-interest basis for the aggregation itself |
| Map/geolocation | Rendering raw device GPS coordinates as an exact point in a GPS-hostile dense urban environment | Show accuracy radius, allow manual pin confirmation on UGC posts, snap zone classification to curated polygons not raw coordinates |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Unclustered map pins rendered individually | Map pans/zooms janky, especially on lower-end Android/iPhone in a PWA (no native rendering optimizations) | Cluster pins at zoom levels below a threshold; virtualize the bottom-sheet list | Once combined scraped+UGC inventory exceeds roughly a few hundred concurrently-visible pins in Centro Storico's small area |
| Fan-out push notification per new listing to all keyword/zone subscribers synchronously | Scraper ingestion job blocks on notification delivery, ingestion cadence slips past the 1-2hr target | Decouple ingestion from notification dispatch via a queue; batch/debounce alerts | Once subscriber count or listing velocity grows beyond what a synchronous loop can clear inside the ingestion window |
| In-app WebView loading full scraped listing pages live | Slow perceived load, breaks silently when Subito changes page structure/adds anti-bot JS challenges to the page itself (not just the API) | Cache a lightweight snapshot (title/photo/price) for the top bar experience; treat the live WebView as best-effort with a robust fallback (open in system browser) | As soon as Subito adds bot-challenge JS to listing pages themselves, not just list/search endpoints |
| No expiry-job backpressure handling | 48-hour auto-expiry job silently stalls or falls behind as listing volume grows, leaving stale "free" items visible past pickup | Make expiry a scheduled, monitored job with alerting on job-run failure, independent of ingestion cadence | Once total active listing count grows enough that a single expiry pass takes longer than the scheduling interval |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Persisting scraped sellers' personal data (names, phone numbers) beyond what's needed for deep-linking | GDPR exposure — scraping public data is one legal question, but *storing/displaying* personal data without a clear lawful basis is a separate, higher-risk one | Store only what's needed to render the pin + deep link (title, photo, rough location, source URL); avoid persisting/display personal identifiers from the source listing |
| UGC photo uploads without EXIF stripping | Photos can leak precise GPS coordinates embedded by the phone camera, exposing a poster's home address even if they only intended to reveal an approximate zone | Strip EXIF geolocation metadata server-side on every UGC photo upload before storage/display |
| Street Dump pins defaulting to exact device GPS with no confirm step | Users unintentionally broadcast their home address (posting from home before heading out) rather than the actual pickup location | Require explicit pin placement/confirmation on the map for every UGC post, never silently auto-submit raw device coordinates |
| In-app DM with no anti-spam/rate limiting on login-optional flows | Login-optional browsing + low-friction posting is an easy target for spam/scam bots seeding fake "free" listings to harvest DM contacts | Rate-limit posting and DM-initiation per device/session even before login is required; require login specifically to gate contact-seller (already planned) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| No distinction in the UI between "scraped, deep-link only" and "UGC, in-app contact" listings | Users tap a scraped item expecting to chat in-app (like a UGC post) and are confused/frustrated when redirected to WebView/external source | Visually and consistently differentiate scraped vs. UGC listings (badge/icon) everywhere they appear — map pin, list card, detail view |
| Presenting scraped "free" listings with the same confidence as verified UGC posts | Users burn trust in the whole product the first time they hit a mislabeled/negotiable-price "free" item (Snag's core failure mode) | Add a lightweight confidence/verification signal for scraped listings, and make the community "report not free" action prominent and low-friction |
| Silent, ungracious degradation of push notifications on iOS | Users on iPhone believe alerts are broken/the app doesn't work, without ever realizing they never completed the Home-Screen install step | Explicit onboarding UI that detects iOS + not-installed-to-home-screen state and walks the user through the Add to Home Screen gesture before offering to enable alerts |
| Exact GPS pin precision presented as certain | Users navigate confidently to a pin that's actually a building-width or canal-width off in Centro Storico's dense geometry | Show an accuracy radius/fuzz on pins, especially for auto-placed (non-manually-confirmed) locations |

## "Looks Done But Isn't" Checklist

- [ ] **Scraper pipeline:** Often "works" against a hand-tested sample but has never survived a real anti-bot response — verify by observing success rate over multiple days of real (not localhost/dev-IP) traffic, not a single successful run.
- [ ] **Push notifications:** Often tested only on Android/desktop Chrome — verify end-to-end on a physical iPhone via an actually-installed (Home Screen) PWA, not the Simulator or a Safari tab.
- [ ] **"Free" listing filtering:** Often filters by category tag alone — verify by manually sampling a batch of live scraped "free" listings and checking how many are actually negotiable/mislabeled.
- [ ] **Map pin placement:** Often demoed in a wide-open test area — verify specifically in Centro Storico's narrow calli near canals/bridges, where multipath GPS error is worst and consequences (wrong bridge/wrong side of canal) are most disruptive.
- [ ] **48-hour auto-expiry:** Often works in a manual test with a handful of listings — verify the job doesn't silently stall or fall behind once listing volume grows and it's running unattended on a schedule.
- [ ] **i18n (IT/EN/ZH):** Often means UI chrome is translated while actual listing content (titles/descriptions from Subito, UGC posts) remains untranslated Italian/mixed-language — verify the product is still usable for a non-Italian-speaking user browsing real listing content, not just menus.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|------------------|
| Subito.it fully blocks/bans the scraper | HIGH | Fall back to manual/community-seeded listings temporarily; pursue an official partnership/API conversation with Subito; communicate transparently to users about reduced scraped inventory rather than silently degrading |
| Scraper selector drift breaks extraction silently for days | MEDIUM | Add the canary/shape-validation harness retroactively (Pitfall 2); backfill/re-run against the affected date range if the source data is still available |
| False-report wave hides legitimate UGC listings | LOW-MEDIUM | Add a "recently auto-hidden, pending review" state and manually restore falsely-hidden posts; raise the report threshold or add reviewability going forward |
| iOS push turns out to reach far fewer users than assumed post-launch | MEDIUM | Ship in-app "new match" badges/list-based alerts as a fallback engagement channel that doesn't depend on OS-level push; invest in the Add-to-Home-Screen onboarding flow retroactively |
| A meetup safety incident occurs | HIGH (reputational) | Have a pre-written incident response/support process ready before launch (not built reactively); retroactively add safety UX (Pitfall 7) is far costlier in trust than shipping it proactively |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|----------------|
| Scraping a site that explicitly forbids it (ToS/legal exposure) | Scraper foundation phase | ToS/robots.txt reviewed and documented before scraper is pointed at production traffic; fallback supply plan exists |
| Soft blocks silently corrupting data | Scraper foundation phase | Shape-validation + canary + alerting harness exists and has been tested against a simulated block |
| Uncapped scraper maintenance burden | Scraper foundation phase | Extraction logic is isolated from fetch/proxy infrastructure; selectors use structural fallback chains |
| Mislabeled "free" listings polluting trust | Scraper/ingestion phase + Map/browse phase | Sampled audit of live "free" listings shows low false-free rate; "report not free" action is live and low-friction |
| iOS push notification funnel failure | PWA/notifications phase | Push tested end-to-end on a real installed-to-Home-Screen iPhone; Add-to-Home-Screen onboarding UI ships alongside push, not after |
| Gameable report/auto-hide mechanic | UGC posting / trust & safety phase | UGC and scraped listings use different report thresholds/review states; a falsely-hidden post can be identified and restored |
| No in-person meetup safety UX | UGC posting phase | Safety messaging is present at first-contact and in the DM thread before public launch |
| GPS/pin accuracy in dense Centro Storico geometry | Map/browse phase + UGC posting phase | Pins show accuracy handling; UGC posts require manual pin confirmation; zone classification uses curated polygons, not raw midpoints |

## Sources

- Subito.it `robots.txt` (fetched directly, 2026-07-26) — primary source, explicit anti-scraping statement. **HIGH confidence.**
- Meta Platforms, Inc. v. Bright Data Ltd. court filings and rulings (TechCrunch, Courthouse News, SCU Law digital commons, 2023-2024) — primary/near-primary legal reporting. **HIGH confidence.**
- WebKit.org official blog, "Web Push for Web Apps on iOS and iPadOS" — official Apple/WebKit source on iOS push requirements. **HIGH confidence.**
- Apple Developer Forums threads on iOS 16.4 PWA push behavior — practitioner-verified, cross-referenced with WebKit docs. **MEDIUM-HIGH confidence.**
- IAPP, EDPB Guidelines 03/2026 on web scraping, Italian Garante-related briefing note — GDPR/scraping legal analysis. **MEDIUM confidence** (case-by-case legal area, not a bright-line rule).
- App Store / Google Play reviews and aggregator write-ups for "Snag - Zero Dollar Items" — direct evidence of the exact failure modes (paywall backlash, "not free" listings) this project is explicitly positioned against. **MEDIUM confidence** (user review text, but highly consistent across independent reviewers and directly named in PROJECT.md's own competitive framing).
- Industry write-ups on anti-bot detection (IP reputation, TLS/JA4 fingerprinting, soft blocks) from Apify, Aethyn, Spidra, krowdev (2026) — practitioner/vendor sources, cross-referenced across multiple independent publishers. **MEDIUM confidence.**
- Solo-developer scraper-maintenance retrospective (BirJob blog) and scraper-resilience engineering write-ups (apiserpent.com, dev.to) — practitioner first-hand accounts. **MEDIUM confidence.**
- OfferUp, Facebook Help Centre, Proton, ABC News safety guidance on marketplace meetup scams — official/mainstream-press safety guidance for the closest analogous UGC marketplace mechanic. **MEDIUM-HIGH confidence.**
- Google/Android urban-GPS-accuracy technical documentation (GPS World, mycoordinates.org reproductions of Google's official blog) — official technical source on urban canyon multipath, generalized here to Venice's dense stone-canal geometry (not skyscraper-specific, so applied with appropriate caveat). **MEDIUM confidence** (well-documented phenomenon; Venice-specific severity is a reasoned extrapolation, not directly measured).

---
*Pitfalls research for: free-item discovery PWA — scraper-heavy map aggregator + UGC marketplace*
*Researched: 2026-07-26*
