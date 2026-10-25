# HANDOFF: feat/stripe-subscriptions (GSD quick 261025-vwf)

Stripe **test-mode** subscriptions behind the hard paywall. This branch is stacked on `feat/onboarding-paywall` (PR #7, quick task 261025-s0z), which holds the onboarding, paywall UI and gate. See that branch's HANDOFF for Part 1.

Nothing here was applied or created remotely. No migration was run against Supabase, no Stripe products or prices were created, and no keys or Vercel settings were touched.

## Done

- **Migration file `supabase/migrations/042_subscriptions.sql`.** Not applied anywhere remote.
  - It creates `public.subscriptions` with one row per user.
  - RLS: `authenticated` can select its own row. There are no write policies, and anon/authenticated have insert, update and delete revoked.
  - `apply_subscription_state(...)` is a security-definer upsert that only `service_role` can execute. It ignores writes older than `last_event_at`, so webhook retries and reordering converge.
  - Checked against a throwaway local `supabase/postgres:17` container: it applies twice idempotently, and `supabase/tests/042_subscriptions.check.sql` prints `CHECKS PASSED` (stale skip, own-row RLS, denied writes, anon sees nothing).
- **Library code:**
  - `lib/stripe/config.ts` enables payments only when all five Stripe vars are set and refuses `sk_live_` keys.
  - `lib/subscriptions/entitlement.ts`: only `active` and `trialing` with an unexpired period unlock. `past_due` stays locked.
  - `lib/subscriptions/sync.ts` maps Stripe events to rows.
  - `lib/subscriptions/store.ts` does service-role reads and RPC writes.
- **Routes:**
  - `POST /api/stripe/checkout` needs sign-in and creates a subscription Checkout with `client_reference_id` and `subscription_data.metadata.user_id`. It returns 503 `payments_disabled` without env and 409 if already subscribed.
  - `GET /api/stripe/checkout/return` is the success_url. It syncs immediately so the user isn't stuck locked while the webhook is in flight, and it verifies the session belongs to the user.
  - `POST /api/stripe/portal` opens the Customer Portal.
  - `POST /api/stripe/webhook` verifies the signature against the raw body and handles `checkout.session.completed` and `customer.subscription.created/updated/deleted`. It returns 500 on write failure so Stripe retries.
  - `GET /api/subscription` reports status for the paywall Restore button and Settings.
- **Gate.** `getSubscriptionActive()` now reads the table for the signed-in user and fails closed.
- **UI:**
  - The paywall CTA posts to Checkout. A 503 shows "Payments aren't enabled yet" (the current state everywhere), 401 asks the user to sign in, and 200 redirects to Stripe.
  - Restore asks guests to sign in and reloads for subscribers.
  - Settings has a "Manage subscription" entry (flag-on builds and Stripe customers only).
  - The locked view shows "activation can take a minute" after returning from Checkout.
- **Account deletion** cancels a live Stripe subscription first, and refuses (502) if Stripe can't cancel. This prevents billing a deleted user.

## How to verify

```
npm test           # 124 files, 745 tests passed (route tests sign payloads with stripe.webhooks.generateTestHeaderString)
npm run lint       # 1 error, pre-existing on main: lib/favorites/store.test.ts:56
npx tsc --noEmit   # same single error
# Node 22 build + app checks via .claude/skills/verify-snap-it-free (see SKILL.md):
#   flag-off 3/3, onboarding 33/33 (CTA -> 503 -> coming soon), compare vs main 2/2 (DOM identical),
#   flag-on persist 6/6; curl: checkout/portal/webhook -> 503 payments_disabled without env.
psql <throwaway db> -f supabase/migrations/042_subscriptions.sql -f supabase/tests/042_subscriptions.check.sql
```

## Not verified (needs Guang's setup)

A real end-to-end purchase is unverified. That means signed-in user → Stripe test Checkout → webhook → unlocked feed → Portal → cancel → locked again. It needs everything in the list below.

## Decisions / actions needed from Guang

1. **Stripe test products/prices.** Create €1.99/week, €4.99/month and €19.99/year recurring prices in Stripe **test** mode. Put their ids in `STRIPE_PRICE_WEEKLY/MONTHLY/YEARLY`. Prices must match `lib/paywall/plans.ts`.
2. **Env vars** (Vercel preview first): `STRIPE_SECRET_KEY` (sk_test_), `STRIPE_WEBHOOK_SECRET`, the three price ids, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_PAYWALL_ENABLED=true` only where the paywall should show.
3. **Webhook endpoint.** Point it at `https://<host>/api/stripe/webhook` for the four events above. For local runs, use `stripe listen --forward-to localhost:<port>/api/stripe/webhook`.
4. **Customer Portal.** Enable cancel and plan switching in Stripe's test-mode Portal settings.
5. **Apply migration 042** to the Supabase project. Deploys that read the table before it exists fail closed: guests and subscribers alike are locked.
6. **Data-level enforcement.** `listings_public` is still anon-readable, so the gate is UI and SSR only. Do you want RLS tightened?
7. **`past_due` grace period.** It is currently locked immediately. Do you want a grace window?
8. **Live mode.** `sk_live_` keys are refused in `lib/stripe/config.ts` by design. Going live is a deliberate code change plus live prices and webhooks.
9. **Legal copy.** Terms and Privacy should mention paid subscriptions, auto-renewal and Stripe as processor before production.

## Notes for the next engineer

- Checkout success and cancel URLs use the request origin (`new URL(request.url).origin`). On Vercel that's the public host. Behind another proxy, check it.
- `checkout.session.completed` refetches the subscription. `customer.subscription.*` events use the payload as-is. Both are stamped with `event.created` for ordering.
