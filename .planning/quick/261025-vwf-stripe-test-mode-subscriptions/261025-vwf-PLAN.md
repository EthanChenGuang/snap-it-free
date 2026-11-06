---
quick_id: 261025-vwf
slug: stripe-test-mode-subscriptions
mode: quick
branch: feat/stripe-subscriptions (stacked on feat/onboarding-paywall)
autonomous: true
---

# Quick Task 261025-vwf: Stripe test-mode subscriptions for the hard paywall

Approved by Guang (2026-10-25): `subscriptions` table updated by Stripe webhooks, Stripe Checkout +
Customer Portal, test mode first. Hard limits: no remote migration, no Stripe products/prices, no live
keys, no Vercel/Stripe/Supabase settings changes. Env names only: STRIPE_SECRET_KEY,
STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_WEEKLY/MONTHLY/YEARLY, SUPABASE_SERVICE_ROLE_KEY.

## Data shapes

- `public.subscriptions` (one row per user): user_id PK → auth.users, stripe_customer_id unique,
  stripe_subscription_id unique, status (Stripe status check), plan (weekly|monthly|yearly),
  price_id, current_period_end, cancel_at_period_end, last_event_at, timestamps.
  RLS on, `select` own row only, no write policies. Writes go through
  `apply_subscription_state(...)` (security definer, execute granted to service_role only), whose
  upsert skips stale writes (`last_event_at` older than stored), so webhook retries and reordering converge.
- `lib/stripe/config.ts`: `readStripeConfig(env)` returns a discriminated union
  `{ enabled: true, secretKey, webhookSecret, prices }` | `{ enabled: false, reason }`. Rejects `sk_live_`.
  Plan↔price table in both directions.
- `lib/subscriptions/entitlement.ts`: `isEntitled(row, now)`, active|trialing and period not ended.
- `lib/subscriptions/sync.ts`: `subscriptionStateFromStripe(sub, userId, at)` (pure) and
  `handleStripeEvent(event, deps)` with injected deps (retrieve subscription, apply state) for tests.
- Purchase UI state moves from the onboarding reducer into `PaywallScreen`:
  `idle | pending | comingSoon | signInRequired | error`, driven by the checkout route's response.

## Tasks

1. Migration `supabase/migrations/042_subscriptions.sql` (file only, not applied), config, entitlement, sync + tests.
2. Routes: `POST /api/stripe/checkout`, `GET /api/stripe/checkout/return`, `POST /api/stripe/portal`,
   `POST /api/stripe/webhook` (signature verified with the raw body), `GET /api/subscription`.
   Tests with a mocked Stripe client. The webhook test signs payloads with Stripe's own test-header helper.
3. Wire `getSubscriptionActive()` to the table and the paywall CTA/Restore to the routes. Add a
   Manage-subscription entry in Settings for subscribers. Verify with lint/tsc/test/build and the verify skill
   (no Stripe env, so the CTA must still show "payments not enabled" and flag-off must stay identical).
