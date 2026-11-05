# Quick 261105-ob6 — "Why you can trust it" onboarding screen

Snag's onboarding has a "Trusted by People Just Like You" testimonial wall (SNAG-ANALYSIS §5). It was the only
Snag screen without a counterpart. We have no real reviews and fake ones break EU UCPD/Omnibus, so this is an
honest stand-in. Content approved by Guang 2026-11-04.

## Design
Stitch project `9058658661756179433`, design system `assets/13036303590552051862` (Lagoon Pop), screen
`857017fd2fa64acb94df6b7ec3835955` → `stitch/trust.png`. Implemented without the Stitch "STEP 6 OF 12" badge and the
footer slogan (other screens have neither; the slogan made claims we did not approve).

## What changed
- `lib/paywall/onboarding-flow.ts`: new intro step `trust` after `favorites` (12 intro steps).
- `components/onboarding/steps/SnagGapSteps.tsx`: `TrustPromises` — four promise cards + live count pill
  (`region.map.total`, the real active count across all cities; hidden while loading).
- Copy en/it/zh: real listings linked to where they were published; live numbers; price and auto-renewal shown
  before paying, cancel any time (Stripe portal, see Terms); payments by Stripe, card never stored by us.
- `drive.mjs`: walks the new step; asserts no star ratings and no listing source names.

## Verify
`npm run lint` clean, `npm test` 864/864. Preview drive 2026-11-05: onboarding 74/74, persist 9/9.
