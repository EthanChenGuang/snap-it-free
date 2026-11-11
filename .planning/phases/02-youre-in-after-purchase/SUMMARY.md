# SUMMARY — Phase 2: You're in after purchase

Shipped on `feat/onboarding-snag`.

## What landed

- `lib/paywall/checkout-return.ts`: `parseCheckoutParam`, `checkoutReturnNotice`, `urlWithoutCheckoutParam`, `applyCheckoutReturnChoices`.
- Unlocked feed (`FeedHomeClient`): `/?checkout=success|pending` shows **You're in** / **Ci sei** / **已开通** (banner + toast) and strips the query param. Language is read from storage at effect time so hydration's zh snapshot cannot toast the wrong locale.
- Locked card: `success|pending` still shows `checkoutPending` (`data-testid=checkout-pending`). `cancel` is ignored.
- Paywall screen entry persists resume + writes city / interests / radius to filter prefs so a Stripe round-trip still applies the quiz answers.
- `CheckoutReturnFromUrl` marks onboarding complete on `success|pending` and re-applies resume prefs.

## Verification

- Unit tests in `checkout-return.test.ts` (13) + locked-card pending cases.
- Local `drive.mjs onboarding` (flag off, no Supabase data): **You're in** PASSES; city=milano, categories=libri-riviste, radiusKm=5 PASS.

## Not in this phase

Real Stripe purchase E2E (HANDOFF §3.6). Preview `/?checkout=success` stays locked without a subscription and must show the pending notice, not "You're in".
