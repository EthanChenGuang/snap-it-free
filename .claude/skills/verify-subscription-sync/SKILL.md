---
name: verify-subscription-sync
description: "Formally check that the subscriptions row converges to Stripe's final state under any webhook delivery order, retry, and checkout-return timing (零元 paywall). Use before and after any change to lib/subscriptions/sync.ts, app/api/stripe/webhook/route.ts, app/api/stripe/checkout/return/route.ts, lib/subscriptions/store.ts, or a migration that redefines public.apply_subscription_state."
---

# Verify subscription sync (paywall)

## The property

**Converges.** Once Stripe stops changing a subscription and every write path has run, `public.subscriptions.status`
equals Stripe's final status.

**Harm when it breaks.** The paywall reads that row (`lib/subscriptions/entitlement.ts`, `has_active_subscription()`
in migration 044). A wrong row means a paying user stays locked out, or a canceled user keeps access, until some later
Stripe event happens to overwrite it — possibly a year later for a yearly plan.

## What is checked, and how

Bounded exhaustive exploration in vitest (no extra install). For each scenario it enumerates every interleaving of:

- Stripe's state changes, in order; each emits `customer.subscription.created/updated/deleted` with
  `event.created` = that change's second, and the first activation also emits `checkout.session.completed`.
- One delivery of every webhook in any order after it is emitted, plus at most one duplicate delivery (Stripe retry)
  of any one subscription event.
- `checkout.session.completed`: the handler's `retrieveSubscription` (reads Stripe's state at that moment) and its write
  as two separate steps, because they are two awaits in `handleStripeEvent`.
- The success_url route `app/api/stripe/checkout/return/route.ts`: never, or once after activation, as retrieve then
  write stamped with server time.

Real code exercised: `handleStripeEvent` and `subscriptionStateFromStripe` (`lib/subscriptions/sync.ts`). The database
write is mirrored in `check/subscription-sync.check.ts` (`applyRow`), but its guard is **parsed from the newest
migration defining `public.apply_subscription_state`** (`where s.last_event_at <= excluded.last_event_at` today), so
changing that SQL changes what is checked. The mirror models one row per user and the guard only; the upsert is one
SQL statement, so it is one indivisible step here too.

Scenarios (the bound), in `check/subscription-sync.check.ts`:

| Group | Scenarios | Expected |
|---|---|---|
| distinct seconds | `incomplete@10 → active@11`; `active@10 → past_due@12 → active@14`; `active@10 → canceled@12` | must pass |
| same second | `incomplete@10 → active@10`; `active@10 → past_due@12 → canceled@12` | **known finding F1** (fails today) |

## Run it

```bash
.claude/skills/verify-subscription-sync/run.sh
```

About 15 s (≈450k interleavings). Exit 0 means every scenario converges. Today it exits 1 because of F1: the
expected output is **3 passed, 2 failed**, and both failures are the same-second scenarios with the counterexamples
below. Anything else is new.

Reading a failure: each counterexample prints as numbered steps ("Stripe: …", "webhook … delivered", "return route …")
ending in "Stripe ends X, but the subscriptions row stores Y". Map each step to the code: deliveries are
`app/api/stripe/webhook/route.ts` → `handleStripeEvent`; the return route is `checkout/return/route.ts`.

- **Real bug**: the steps are all things Stripe or a user can do (reorder, retry, close the tab) and the row is wrong.
- **Modeling error**: a step the real system cannot take (e.g. a delivery before its event exists, a return-route
  write before activation). Fix the checker, not the property.

## Known finding F1 (open, 2026-10-30)

Stripe's `event.created` has one-second resolution, and the guard keeps "newer **or equal** wins", so two changes in
the same second are applied in delivery order, not in the order they happened.

1. Checkout, same second — Stripe ends `active`, row stores `incomplete` (user paid, stays locked):
   1. subscription becomes incomplete at second 10; 2. becomes active at second 10;
   3. `customer.subscription.updated` (active@10) delivered; 4–5. `checkout.session.completed` retrieves and writes
   active stamped 10; 6. `customer.subscription.created` (incomplete@10) delivered last → overwrites;
   7. the return route never runs (tab closed, or not signed in on that browser).
2. Renewal fails then cancels in one second — Stripe ends `canceled`, row stores `past_due` (canceled user keeps
   access for the 3-day past_due grace, and longer if `past_due_since` is old).

Changing `<=` to `<` does not fix it (first write wins instead; the other order breaks). A real fix makes the stored
state independent of delivery order, e.g. every subscription webhook re-retrieves the subscription from Stripe and
stores it stamped with processing time, as `checkout.session.completed` already does. Product code was not changed;
that decision is Guang's. When F1 is fixed, both same-second scenarios must pass; then delete this section and the
"known finding" note in the test, and move the sync commit.

## Not covered

- Clock skew between Vercel and Stripe (the server clock is assumed to be just after the latest Stripe change).
- Two subscriptions for one user, `stripe_customer_id` changes, deleting the row, `past_due_since` bookkeeping, and
  `current_period_end` (entitlement time checks are covered by `lib/subscriptions/entitlement.test.ts` and the
  SQL parity tests, not here).
- Retries of `checkout.session.completed`, more than one duplicate delivery, and histories longer than three changes.
- RLS and the listings gate itself (migration 044).

## Coverage record

Last confirmed in step with the code at commit **7fbb00d** (branch `preview/recent-changes`):

- `lib/subscriptions/sync.ts` — `handleStripeEvent`, `subscriptionStateFromStripe`
- `app/api/stripe/webhook/route.ts` — `POST`
- `app/api/stripe/checkout/return/route.ts` — `GET`
- `lib/subscriptions/store.ts` — `applySubscriptionState` (calls the RPC)
- `supabase/migrations/043_subscriptions_past_due_since.sql` — `public.apply_subscription_state` (guard parsed)

To see whether the verification needs another look: `git log --oneline 7fbb00d..HEAD -- <the files above> supabase/migrations`.
Move the sync commit only after you confirm the model still describes the code at the new commit (new event types,
a new writer, a changed stamp, or a new migration redefining the function all need the checker updated first).

## Updating the check

- New writer or event type: add it as a move in `checkScenario`, with retrieve and write split if the code awaits
  between them.
- Intended behaviour change: update the scenarios' expected group and this file; never relax `Converges` to make a run
  pass.
- Prove the check can still fail after any change to it: break the real code on a scratch branch (for example delete
  the `where s.last_event_at <= excluded.last_event_at` line from the newest migration) and confirm the
  distinct-second scenarios fail, then restore.
