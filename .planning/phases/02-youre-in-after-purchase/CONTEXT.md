# Phase 2 — "You're in" after purchase (PROPOSAL P10)

## Goal

When Stripe Checkout returns the user to `/`, show a success toast if the feed is unlocked, keep the existing "activation can take a minute" notice if it is still locked, and apply the onboarding city, interests and radius to the unlocked feed.

## Current behaviour (verified in code)

- Success URL: `/api/stripe/checkout/return?session_id=…` → `/?checkout=success` or `/?checkout=pending`.
- Cancel URL: `/?checkout=cancel` (ignored by the locked card).
- `LockedCard` shows `locked.checkoutPending` when `checkout` is `success` or `pending` **and the view is still locked**.
- There is **no** success toast when access is `open`.
- Filter prefs (city, categories from interests, `radiusKm`) are written only when the onboarding screen becomes `done` (paywall ✕). A user who goes to Stripe from the paywall without closing it never hits `done`, so prefs and the completed flag may be missing on return.

## Decisions (auto-answered from HANDOFF / PROPOSAL / Guang)

- Copy: short toast **You're in** / **Ci sei** / **已开通**. No EU 14-day withdrawal clause.
- Locked + `checkout=success|pending` → keep the existing pending notice. Do **not** toast "You're in" while locked (that would be dishonest).
- Unlocked + `checkout=success|pending` → toast "You're in" (they can see the feed).
- Persist onboarding answers into `shoumanwu_filter_prefs` when the paywall screen is reached, and re-apply from resume on checkout return. Mark onboarding complete on `success|pending` so the overlay does not reopen.
- No real Stripe purchase, no DB migration, no Vercel/Supabase remote changes.

## Files

- `lib/paywall/checkout-return.ts` (new, pure)
- `components/onboarding/CheckoutReturnFromUrl.tsx` (new)
- `components/listings/FeedHomeClient.tsx`, `components/onboarding/LockedViews.tsx`, `components/onboarding/OnboardingFlow.tsx`
- `messages/{en,it,zh}.ts`, `components/ui/toaster.tsx`
