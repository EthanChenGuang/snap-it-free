# Quick 261031-ob4 — Snag screen parity + hide listing sources

Guang (2026-10-31): no source names (e.g. Subito) in the onboarding; every onboarding screen Snag has, we have too —
Snag's *form*, our own content and our own UI (Stitch, Lagoon Pop design system `assets/13036303590552051862`,
project `9058658661756179433`).

## Snag screens vs ours (see ../261025-s0z-onboarding-paywall-flow/SNAG-ANALYSIS.md)
| Snag | Ours | Status |
|---|---|---|
| Intro "Get anything for free" + collage + claimed count | hook (real photos, real live count) | had |
| "Discover free items around you" (feed) | how | had |
| "80,000+ items shared every week" | **weekly** — real 7-day total, per-day bars, newest, city count | **new** |
| Location + "N items in your area" with map pins | **map** — real pins of the busiest city at real relative positions | **new** |
| "Save your favorite finds" | **favorites** — real items, heart, ♥ tab | **new** |
| Alerts lock screen | alerts | had |
| City / personal teaser, blurred preview, paywall | city, preview, paywall | had |
| Testimonial wall, rating prompt before use | — | not built: no real reviews exist; fake ones break EU UCPD/Omnibus and App Store 5.6.1 |

## Source names removed
hook body, "how" title + first row ("five apps", "Subito + …"), paywall benefit "from all sources" — en/it/zh.
drive.mjs asserts the hook and how screens contain no source names.

## Files
`lib/paywall/onboarding-stats.ts` (+test), `components/onboarding/steps/SnagGapSteps.tsx`, `useOnboardingData.ts`
(region teaser carries daily/newest/cities/map/favorites), `onboarding-flow.ts` (11 intro steps), `OnboardingFlow.tsx`,
`pop-theme.ts` tints, `messages/{en,it,zh}.ts`, `drive.mjs`. Stitch PNGs in `stitch/`.
