# PLAN — Phase 2: You're in after purchase

## Tasks

1. Add `parseCheckoutParam`, `checkoutReturnNotice(access, checkout)`, `urlWithoutCheckoutParam` with unit tests for every access × param combination.
2. Add `locked.checkoutSuccess` in en/it/zh; keep `checkoutPending` unchanged.
3. Unlocked feed (`FeedHomeClient`): on `success|pending`, toast `checkoutSuccess` (`data-testid=checkout-success`) and strip the query param.
4. Locked card: keep pending notice for `success|pending`; add `data-testid=checkout-pending`; still ignore `cancel`.
5. On paywall screen entry: persist resume state + write filter prefs from onboarding answers (city, interests → categories, radiusKm, locationGranted).
6. On checkout `success|pending` return (layout helper): `markOnboardingCompleted` + apply resume prefs if present.
7. Unit tests: notice mapping, prefs written from onboarding answers (already in `onboarding-interests.test.ts`, extend if needed), locked card pending, unlocked toast test-id.

## Done when

- Unlocked `/?checkout=success` shows "You're in" and not the pending banner.
- Locked `/?checkout=success` shows the pending banner and not "You're in".
- City / interests / radius from onboarding are in `shoumanwu_filter_prefs` when the unlocked feed opens.
