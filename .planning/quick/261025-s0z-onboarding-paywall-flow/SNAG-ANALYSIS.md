# Snag – Zero Dollar Items: pre-browse marketing / paywall flow analysis

Sources (public only, fetched 2026-10-25): App Store listing (id6755341741, 7 screenshots `appstore-01..07.jpg`, IAP list, description, reviews), Google Play listing (com.improvement.snag, 6 screenshots `play-03..08.png`, reviews), snagapp.framer.website (landing: "Snag – get stuff for free / Why pay for something when you can get it for free?"), AppBrain review mirror. No binary was downloaded or decompiled; nothing behind login was accessed.

Important caveat: the store screenshots are marketing frames, not literal captures of the in-app onboarding. The in-app order below is reconstructed from the store frames (which mirror the onboarding value props), the App Store description (which itself documents "Initial onboarding introduction → Overview of how Snag works → Demo preview of sample free listings → limited non-interactive preview feed (mock data)"), and user reviews.

## 1. Store marketing frames (order as published)

| # | Headline copy | Visual | Notes |
|---|---|---|---|
| 1 | "Get *Anything* For **FREE**" (red underlined FREE), red SNAG tag logo | Cloud of circular product cut-outs (sofa, AirPods, sneakers, headphones, lamp, car) | Social proof footer "430,200+ Free Finds Claimed So Far" |
| 2 | "Discover *Free* Items Available Around You" | Phone with grid feed, green "FREE" badges, distance + "10 min ago" | Location header "Your Location 1226 University Dr" |
| 3 (Play) | "80,000+ Items Shared Every Week" | Grid feed + green pill "12,000+ items added daily" | Volume claims |
| 4 | "Save Your *Favorite Finds* for Later" | Favorites grid / listing detail with red "Snag it" CTA | |
| 5 | "Get *Instant Alerts* When Neighbors Post" | iOS lock screen with 4 push notifications ("Free Bookshelf 2 Blocks Away!") | Primes notification permission |
| 6 (Play) | "Trusted by *People* Just Like You" | Wall of 5-star testimonial cards | Social proof |

Typography: bold sans + italic serif accent word; light blue-grey background with sparkles; red brand accent; green "FREE" badges.

## 2. Reconstructed in-app pre-browse flow

1. **Intro / value prop** – "Get anything for free" + item collage + claimed-count social proof. CTA: full-width "Continue". Progress: dots / step bar.
2. **How it works** – aggregated feed + map of items near you (mirrors frames 2–3).
3. **Alerts** – lock-screen notification mock (frame 5), followed by the OS notification permission prompt.
4. **Rating prompt BEFORE use** – reviews (Play, AppBrain: "asks for a rating BEFORE you even use it", "wants you to review the app before they even let you use it").
5. **Location** – location permission / "Your Location"; then a teaser "N free items in your area" with map pins ("claims there are '7 free items in your area' and shows nearby map pins").
6. **Locked/blurred preview feed** – "Everything is blurred, so you can't see what is free near you"; listing tap requires subscription. Store description admits this preview is **mock data**.
7. **Paywall (hard)** – must subscribe to use the app at all ("*You need to pay to use our app"). Plans from App Store IAP list: Weekly $3.99–$9.99, Monthly $4.99–$6.99, Yearly $18.99–$39.99 (multiple A/B price points). Reviews: "$10 a week", "promo 3.99 a month but charged the whole year the next day" → the highlighted/default plan appears to be yearly with ambiguous framing. Close-button timing and restore/terms placement can't be confirmed from public material; Terms/Privacy live on the framer site.
8. **After payment** – reviews report the teaser items disappear, results 600 miles away, "NOT FREE" items (bait-and-switch), listings deep-link out to Craigslist etc.

## 3. Patterns to ADOPT (adapted to 零元 design system, not Snag's red theme / capsule nav)

- Short 3–4 step intro with one idea per screen, big headline with one emphasized word, single primary CTA, step progress indicator, Skip.
- Value props: free items near you → aggregated feed + map → alerts.
- Personalisation step before the paywall (pick your city) so the teaser is relevant.
- Teaser built from **real** data: real current count of active free listings in the chosen city + real thumbnails from Supabase.
- Ask for notification permission only in context (optional alerts step), never forced.
- Paywall layout: benefit list, 3 plan cards (weekly / monthly / yearly) with one highlighted "best value", per-week equivalent, single CTA, restore + terms + privacy links.

## 4. Patterns to REJECT (deceptive / against PRODUCT.md "Real supply first")

- Mock / fake counts or listings presented as real ("7 free items in your area").
- Inflated unverifiable social proof ("430,200+ claimed", "80,000+ weekly", testimonial walls).
- Rating prompt before use.
- Hidden or delayed close button; hard paywall with no free path.
- Blurred bait feed whose items vanish after payment.
- Ambiguous trial / plan framing; price and auto-renewal terms must be stated next to the CTA.
- Red theme + floating capsule nav (PRODUCT.md: Snag informs interaction only).
