# Snag – Zero Dollar Items: onboarding & conversion teardown

Researched 2026-10-28 (Europe/Rome) from public sources only. No account was created, nothing was bought, no paywall or login was bypassed, and no app binary was downloaded or decompiled.

## 0. Which "Snag"

**Picked: Snag – Zero Dollar Items** (seller Rotu Teknoloji A.Ş. / "rotu", later "part of rohe.ai"; built by Benji Chen's team at 10x Studio). It is a near-exact analogue of 零元: a free-stuff aggregator with a feed, map, favorites, alerts, and a hard paywall.

| Store | Link | Facts read 2026-10-28 |
|---|---|---|
| iOS App Store (US) | https://apps.apple.com/us/app/snag-zero-dollar-items/id6755341741 | 4.6★, 7.6–7.7K ratings, Shopping, v1.0.44 (Aug 24 2026), released 2025-11-21, EN+DE |
| Google Play | https://play.google.com/store/apps/details?id=com.improvement.snag | 4.2★, ~645 reviews, dev "rotu.ai", "now available in Germany" |
| Web | https://snagapp.com · https://snagapp.framer.website | Landing: "Why pay for something when you can get it for free?" |

Rejected alternatives:

| App | Link | Why rejected |
|---|---|---|
| Snag AI – Marketplace Deal Analyzer | https://apps.apple.com/us/app/snag-ai/id6758535505 | Scans marketplace listings for a fair price. Not free stuff, not a feed or map |
| Snagajob – Jobs Hiring Now | https://apps.apple.com/us/app/snagajob-jobs-hiring-now/id333188676 | Job search |
| The Snag App (thesnagapp.com) | https://thesnagapp.com | Social and dating network for Indigenous people |

## 1. Evidence inventory and completeness

| ID | Source | What it shows | File |
|---|---|---|---|
| S1 | App Store listing, US (screenshots, description, IAP list, version history, privacy labels) | 4 iPhone marketing frames, 3 iPad frames; description says the free tier is "Initial onboarding introduction · Overview of how Snag works · Demo preview of sample free listings · A limited, non-interactive preview feed (mock data)"; 10 IAP price points | `screenshots/ios/ios_01–07.jpg`, `sources/ios_us.html` |
| S2 | Google Play listing | 6 marketing frames, including 2 not on iOS: "80,000+ Items Shared Every Week" and "Trusted by People Just Like You" (testimonial wall); reviews | `screenshots/android/play_01–06.png`, `sources/play.html` |
| S3 | paywallscreens.com (Superwall's gallery), capture dated 10/27/2026 | **The only literal in-app screen found: the paywall** | `screenshots/paywall/paywallscreens_2026-10-27.png`, `sources/paywallscreens.html` |
| S4 | App Store reviews (US/GB/CA/AU/DE) | Users describing the in-app flow (blurred feed, gating, plan options) | `sources/reviews_*.html`, `sources/all_reviews_extracted.txt` |
| S5 | Google Play / AppBrain reviews | "asks for a rating BEFORE you even use it", "claims there are '7 free items in your area' and shows nearby map pins", "join as a guest", "Everything is blurred" | AppBrain: https://www.appbrain.com/app/snag-zero-dollar-items/com.improvement.snag |
| S6 | Founder interview: Starter Story, "I Built A $30K/Month App: Here's My Exact Process" (YouTube https://www.youtube.com/watch?v=P4QodeA_lQ0, transcript page https://www.starterstory.com/snag) | Superwall A/B paywalls; weekly/monthly/yearly/one-time plans; Mixpanel to measure onboarding; "100,000 authenticated users", "9,000 conversions"; ratings as social proof; Loops win-back email to churned users | `sources/starterstory.txt` |
| S7 | Secondary write-ups: GTM Sauce https://gtmsauce.com/companies/snag, Shipped & Paid https://shippedandpaid.com/cases/snag-free-stuff-finder-app-30k-mrr-claude-code-cursor/, Screenies https://screenies.app/apps/6755341741-snag-zero-dollar-items, CloneChart https://clonechart.io/app/6755341741 | They restate S1 and S6. No new screens | — |
| S8 | Earlier in-repo analysis `.planning/quick/261025-s0z-onboarding-paywall-flow/SNAG-ANALYSIS.md` (2026-10-25) | Same public sources. One review quote ("promo 3.99 a month but charged the whole year") comes only from here; I could not re-find it today | repo |

Not found or not usable:
- No Snag entry on Mobbin, ScreensDesign, Page Flows, or UXArchive. Page Flows' search has no Snag result, ScreensDesign returns 404 for the app slug, and Mobbin is behind a login.
- No YouTube or TikTok onboarding walkthrough was found. The only video is the founder interview (S6), which I could not watch; I read its transcript text.
- REA tool: branch `cursor/rea-cloud-agent-setup-a2d0` only adds `rea-agents@6.5.0`, described as "reverse engineer anything … binary-analysis, decompiler, ghidra, ida". It is not installed on this box. It only helps if you have the IPA/APK. Pulling Snag's APK from a mirror and decompiling it falls outside "public assets", so I did not do it. Doing it would recover the exact onboarding strings and screen order. That decision is Guang's.

**How complete is the evidence:** about 40%. The value-prop content (6 frames) and the paywall (1 real capture) are well evidenced. The order of the in-app steps, the rating prompt, the account/guest step, the location step, and the blurred feed come only from user descriptions. **Five of the ~11 steps have no public image.** I found no evidence of a personalization quiz, a free trial, or close-button timing.

Contact sheet (reconstructed order; red labels = no image): `snag-onboarding-contact-sheet.jpg`.

## 2. Screen-by-screen spec (reconstructed order)

Legend: **SEEN [S#]** = visible in a captured image or stated verbatim in a source. **REPORTED [S#]** = described by users, with no image. **INFERRED** = my reasoning, not evidenced.

Overall order: **INFERRED** from the store description's own sequence ("onboarding introduction → overview of how Snag works → demo preview → non-interactive preview feed") [S1], plus reviews that put the rating ask, location, and "N items in your area" before purchase [S5, S4].

### 1. Hook / value prop
- Copy: "Get *Anything* For **FREE**". The sans-serif headline puts one italic serif word ("Anything") and one red underlined word ("FREE") in contrast. Footer: "430,200+ Free Finds Claimed So Far". **SEEN [S1 ios_01, S2 play_01]**
- Visual: red "SNAG" price-tag logo; bubble cloud of circular product cut-outs (sofa, AirPods, sneakers, headphones, scooter, lamp, bottle); pale blue-grey background with sparkles. **SEEN**
- In-app: probably the first onboarding page with a full-width Continue button and a progress indicator. **INFERRED.** The style of the progress indicator is unknown.
- Purpose: instant value ("free stuff worth hundreds"). The founder designs the "3-second hook" first [S6].

### 2. "Discover *Free* Items Available Around You"
- A phone shows a 2-column feed: green FREE badges, "0.32 mi · 1 min ago", a "Your Location 1226 University Dr" header, a search field, and a floating red-capsule bottom nav. **SEEN [ios_02, play_02]**
- Purpose: show the product (feed + proximity + freshness). The proximity/recency metadata implies urgency.

### 3. Volume claim: "*80,000+* Items Shared Every Week"
- Grid of items with a green pill "12,000+ items added daily". **SEEN [play_03], Play only**
- Purpose: supply social proof. Unverifiable: reviews report "never anything listed" in their area [S4].

### 4. "Save Your *Favorite Finds* for Later"
- Item detail (monitors) with a red "Snag it" CTA; on Android, a favorites grid with red hearts. **SEEN [ios_03, play_04]**
- Purpose: introduce ownership/collection (endowment).

### 5. "Get *Instant Alerts* When Neighbors Post"
- iOS lock screen at 9:41 with 4 stacked notifications: "Free Bookshelf 2 Blocks Away!", "Free Coffee Maker 0.5 mi Away", "Vintage Lamp 1.2 mi Away", "Dining Chair Free, 3 Blocks Away". **SEEN [ios_04, play_05]**
- In-app, this frame most likely primes the OS notification prompt. **INFERRED.** The Android manifest requests POST_NOTIFICATIONS and fine/coarse location (AppBrain permission summary) [S5].
- Purpose: permission priming plus urgency ("2 blocks away").

### 6. "Trusted by *People* Just Like You"
- A wall of ~12 five-star testimonial cards with US names and cities. **SEEN [play_06], Play only**
- The testimonials cannot be verified.

### 7. Rate-the-app prompt before use
- "This app asks for a rating BEFORE you even use it" (Cameron Wheeler, Play, 2 Aug 2026); "It wants you to review the app before they even let you use it" (vanessa martinez, 14 Aug 2026). **REPORTED [S5]**. No image. Whether it is the native SKStoreReview sheet or a custom screen is unknown.
- Purpose: inflate ratings early. The founder calls the 3.3K ratings "very important social proof" [S6], and the paywall reuses them as "9k+ 5-Star Review".

### 8. Account / guest
- "once you create a 'free' account it will not let you do anything" [S4 G1z4w4y]; "when you just join as a guest" [S5]; the founder reports "100,000 authenticated users" and notes you must "add authentication so it passes App Store review" [S6/S7]. **REPORTED.** Provider options (Apple/Google/email) are unknown. Position relative to steps 7 and 9 is **INFERRED**.

### 9. Location → "N free items in your area" + map pins
- "claims there are '7 free items in your area' and shows nearby map pins to pressure you into paying $5"; "I set it to my current location and prior to purchasing … it showed me a screen with multiple items and their distance away from me" [S4, S5]. **REPORTED.**
- After paying, users report items "over 600 miles away", items that "disappeared", and "NOT FREE" posts. The App Store description admits the pre-purchase feed is **mock data** [S1]. So the local count and pins shown before purchase appear to be fabricated or generic.

### 10. Blurred / locked preview feed
- "if you don't pay for it, all you see is the entire screen blurred … you can't look at your 'favorites'" [S4]; "Everything is blurred" [S5]; "if you try to click any of them, use the search bar, add to favorites, literally anything at all an annoying prompt will come up telling you to subscribe" [S4]. **REPORTED.**
- Every tap opens the paywall: a "paywall on every interaction" pattern.

### 11. Paywall (Superwall-hosted)
**SEEN [S3]**, top to bottom:
- Mascot: red-collared maneki-neko (lucky cat) with a "Snag" tag.
- H1: "Get everything for free with Snag."
- Two gold laurel badges: "9k+ 5-Star Review" and "Top 10 Shopping Apps".
- Line: "Why pay for something that you can get for free?"
- Plan cards: **Yearly Plan, preselected**, red border and pink fill, red corner tag "SAVE 90%", priced as "$1.92/week". Monthly Plan "$19.99/month", unselected.
- Fine print above the CTA: "Billed as $99.99/year cancel anytime."
- Full-width red "Subscribe" CTA.
- Bottom row: "RESTORE" (left), "SKIP" (right), both small grey caps. "TERMS OF USE . PRIVACY POLICY" below.
- No free trial on this variant. Reviews confirm this ("No free trial", "at least give a free trial!!") [S4].
- **Close/skip timing:** a SKIP text link exists, but it is low-contrast and placed bottom-right in the same style as Restore. No top-corner ✕ is visible. Whether it appears after a delay is unknown.
- **Pricing math check:** $99.99/52 = $1.92/week ✓. Against the monthly plan on the same screen ($19.99 × 12 = $239.88), the saving is **58%, not 90%**. A 90% saving only works against a weekly plan of about $19+/week, and none is shown. The "SAVE 90%" claim is not supported by the prices on the screen.
- Price A/B: the App Store lists 10 SKUs (weekly $3.99/$5.99/$6.99/$9.99; monthly $4.99/$5.99/$6.99; yearly $18.99/$24.99/$39.99) [S1]. The $99.99 yearly and $19.99 monthly seen in S3 are not among them, which points to a test, a regional variant, or a stale capture. **INFERRED.** Users quote "$10 a week", "$5", "$24", and "£40/year (the only option they give you)" [S4]. The founder confirms weekly, monthly, yearly, and one-time plans A/B tested in Superwall [S6].

### 12. After the paywall
- Skip leads to the locked/blurred feed (step 10), and every tap reopens the paywall. **INFERRED** from S4/S5.
- Churn win-back email via Loops [S6]. This implies email capture at account creation. **INFERRED.**

Global visual style: light blue-grey canvas with star sparkles, bold geometric sans plus an italic serif accent word, red brand accent, green FREE badges. **SEEN.** The animations and transitions between steps cannot be seen in stills and are **unknown**.

## 3. Conversion techniques Snag uses

| # | Technique | How Snag uses it | Evidence | EU risk if we copy it as-is |
|---|---|---|---|---|
| 1 | Value demo before the ask | Intro pages + demo feed + "N items in your area" before the paywall | S1 description (mock data), S4/S5 | Fine with real data. With **mock data presented as local**, it is a misleading action under the UCPD (Dir. 2005/29/EC Art. 6; Codice del Consumo art. 21) |
| 2 | Personalization / sunk-cost quiz | **Not observed.** Only location is set (S4). No interest quiz evidenced | — | n/a |
| 3 | Location relevance hook | Location set → local count + pins | S5 | Fine if the count is real and the radius is stated |
| 4 | Social proof: volume | "430,200+ Free Finds Claimed", "80,000+ Items Shared Every Week", "12,000+ items added daily" | S1, S2 | Unverifiable volume claims are misleading if untrue |
| 5 | Social proof: testimonials | Wall of 5★ cards with names | S2 play_06 | **High.** Omnibus Dir. 2019/2161 adds fake or unverified reviews to the UCPD blacklist (Annex I 23b–23c) |
| 6 | Social proof: ratings and awards | "9k+ 5-Star Review", "Top 10 Shopping Apps" laurels on the paywall | S3 | "Top 10" needs a verifiable source; we have no app-store ratings at all (PWA) |
| 7 | Rating prompt before use | Asks for a review before the app is used | S5 (2 reviews) | Review solicitation before use skews ratings; it violates Apple's guidance and risks the review blacklist. Not applicable to our PWA anyway |
| 8 | Urgency / FOMO | "Grab valuable items before they're gone", "minutes away", "1 min ago", "2 Blocks Away!" | S1 description, frames | Fine when the timestamps are real. **Fake** scarcity ("only N left / offer ends") is blacklisted (UCPD Annex I #7) |
| 9 | Curiosity gap / loss aversion | Blurred feed; every tap opens the paywall; "Why pay for something…?"; "Stop paying. Start snagging." | S3, S4, S5 | Blurring **real** items is fine. Teasing items that disappear after payment is bait-and-switch (UCPD Annex I #5/#6) |
| 10 | "Free" framing of a paid product | "Get everything for free with Snag" on the paywall | S3 | **High.** UCPD Annex I #20 bans calling something "free" if the consumer must pay more than unavoidable costs. Our name 零元/ZeroDollar makes this sensitive |
| 11 | Price anchoring | Yearly shown as a per-week price ($1.92/week); expensive monthly ($19.99) as a decoy; "SAVE 90%" | S3 | Savings % must be true for the plans shown. Per-week framing is OK only if the total billed is equally visible |
| 12 | Plan default | Yearly preselected and visually dominant | S3; "paid for a year (the only option they give you)" S4 | Preselecting the best-value plan is common; make sure the user sees and can choose the others |
| 13 | Trial framing | **No trial** in the observed variant | S3, S4 | — |
| 14 | Hidden or weak exit | "SKIP" is small grey text bottom-right; no ✕ visible | S3 | Hard-to-find dismissal is a dark pattern (DSA Art. 25 for platforms; UCPD aggressive practices). It also contradicts our PRODUCT.md "close button always visible" |
| 15 | Permission priming | Lock-screen notification mock before the alerts ask | S1 ios_04 (store frame); in-app use INFERRED | Fine. Ask in context; GDPR/ePrivacy require consent for location and notifications |
| 16 | Paywall on every interaction | Search, favorite, tap → paywall | S4 | Legal, but drives 1★ reviews ("annoying") |
| 17 | Account before payment + win-back email | Account/guest step; Loops email to churned users | S4, S5, S6 | Marketing email needs opt-in consent (GDPR/ePrivacy) |
| 18 | Paywall price A/B testing | 10 SKUs; Superwall | S1, S6 | Fine. Under Omnibus/PID Art. 6a, a "discount" needs the lowest price of the prior 30 days |
| 19 | Onboarding analytics | Mixpanel funnel on onboarding | S6 | GDPR consent for non-essential analytics |

What Snag's results show: high conversion (about 9K paid out of 100K authenticated users, about 9%, founder figures, unverified [S6]), but heavy 1★ backlash for bait-and-switch: mock local items, far-away listings, "NOT FREE" items, no trial, refund trouble [S4, S5]. The tactics that drive their reviews down are the same ones that would be illegal or risky for us in the EU.
