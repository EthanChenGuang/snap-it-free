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
- Every handler that retrieves (`checkout.session.completed`, `customer.subscription.created/updated`) as two steps:
  retrieve (reads Stripe's state at that moment) then write, because they are separate awaits in `handleStripeEvent`.
  The handler's `now()` returns the server-clock reading of whichever step it is called in, so the order of
  `now()` and `retrieveSubscription` in the real code is what gets checked. `customer.subscription.deleted` writes
  its payload in one step.
- The success_url route `app/api/stripe/checkout/return/route.ts`: never, or once after activation, as stamp + retrieve
  then write. This route is mirrored (stamp, then `subscriptionStateFromStripe`), not executed.
- Server-clock readings strictly increase in real order and are never earlier than the latest Stripe change.

Real code exercised: `handleStripeEvent` and `subscriptionStateFromStripe` (`lib/subscriptions/sync.ts`). The database
write is mirrored in `check/subscription-sync.check.ts` (`applyRow`), but its guard is **parsed from the newest
migration defining `public.apply_subscription_state`** (`where s.last_event_at <= excluded.last_event_at` today), so
changing that SQL changes what is checked. The mirror models one row per user and the guard only; the upsert is one
SQL statement, so it is one indivisible step here too.

Scenarios (the bound), in `check/subscription-sync.check.ts`:

| Group | Scenarios | Expected |
|---|---|---|
| distinct seconds | `incomplete@10 → active@11`; `active@10 → past_due@12 → active@14`; `active@10 → canceled@12` | must pass |
| same second | `incomplete@10 → active@10`; `active@10 → past_due@12 → canceled@12` | must pass (F1 regression) |

Identical states reached by different orders are explored once (`stateKey`), about 170k distinct states in total.

## Run it

```bash
.claude/skills/verify-subscription-sync/run.sh
```

About 15 s. Exit 0 means every scenario converges; the expected output is **5 passed**.

Reading a failure: each counterexample prints as numbered steps ("Stripe: …", "webhook … delivered", "return route …")
ending in "Stripe ends X, but the subscriptions row stores Y". Map each step to the code: deliveries are
`app/api/stripe/webhook/route.ts` → `handleStripeEvent`; the return route is `checkout/return/route.ts`.

- **Real bug**: the steps are all things Stripe or a user can do (reorder, retry, close the tab) and the row is wrong.
- **Modeling error**: a step the real system cannot take (e.g. a delivery before its event exists, a return-route
  write before activation). Fix the checker, not the property.

## Finding F1 (fixed 2026-10-30)

Found by this check, fixed in `lib/subscriptions/sync.ts` and `app/api/stripe/checkout/return/route.ts`.

Before: subscription webhooks stored the event payload stamped with Stripe's `event.created` (one-second
resolution), and the guard keeps "newer **or equal** wins". Two changes in the same second were applied in delivery
order, not in the order they happened:

1. Checkout, same second — Stripe ends `active`, row stored `incomplete` (user paid, stayed locked): `updated`
   (active@10) and `checkout.session.completed` delivered, then `created` (incomplete@10) delivered last and
   overwrote; the return route never ran.
2. Renewal fails then cancels in one second — Stripe ends `canceled`, row stored `past_due` (grace access).

`<` instead of `<=` does not fix it (first write wins; the other order breaks). The fix: `created`/`updated`
re-retrieve the subscription and every write is stamped with the server clock read **before** the retrieve (so a
later stamp always carries a state at least as new); `deleted` writes its terminal payload stamped with the server
clock; the return route also stamps before retrieving.

Proven both ways: the pre-fix `sync.ts` (`git show 7fbb00d:lib/subscriptions/sync.ts`) reproduces both
counterexamples; moving `now()` after `retrieveSubscription` fails all five scenarios.

## Not covered

- Clock skew between Vercel instances, and rows written before the fix (stamped with Stripe seconds; a new write
  stamped with server time always wins over them).
- Two subscriptions for one user, `stripe_customer_id` changes, deleting the row, `past_due_since` bookkeeping, and
  `current_period_end` (entitlement time checks are covered by `lib/subscriptions/entitlement.test.ts` and the
  SQL parity tests, not here).
- Retries of `checkout.session.completed`, more than one duplicate delivery, and histories longer than three changes.
- The return route's code itself (it is mirrored); a stamp moved after its `sessions.retrieve` would not be caught.
- Stripe's retrieve failing (the webhook returns 500 and Stripe retries; that is just another delivery here).
- RLS and the listings gate itself (migration 044).

## Coverage record

Last confirmed in step with the code at commit **SYNC_COMMIT** (branch `preview/recent-changes`):

- `lib/subscriptions/sync.ts` — `handleStripeEvent`, `subscriptionStateFromStripe`
- `app/api/stripe/webhook/route.ts` — `POST`
- `app/api/stripe/checkout/return/route.ts` — `GET`
- `lib/subscriptions/store.ts` — `applySubscriptionState` (calls the RPC)
- `supabase/migrations/043_subscriptions_past_due_since.sql` — `public.apply_subscription_state` (guard parsed)

To see whether the verification needs another look: `git log --oneline SYNC_COMMIT..HEAD -- <the files above> supabase/migrations`.
Move the sync commit only after you confirm the model still describes the code at the new commit (new event types,
a new writer, a changed stamp, or a new migration redefining the function all need the checker updated first).

## Updating the check

- New writer or event type: add it as a move in `checkScenario`, with retrieve and write split if the code awaits
  between them.
- Intended behaviour change: update the scenarios' expected group and this file; never relax `Converges` to make a run
  pass.
- Prove the check can still fail after any change to it: break the real code on a scratch branch and confirm it
  fails, then restore. Known-good breaks: delete the `where s.last_event_at <= excluded.last_event_at` line from the
  newest migration (all five fail); move `const at = now()` below `retrieveSubscription` in `handleStripeEvent`
  (all five fail); restore the pre-fix `sync.ts` from commit 7fbb00d (the two same-second scenarios fail).
