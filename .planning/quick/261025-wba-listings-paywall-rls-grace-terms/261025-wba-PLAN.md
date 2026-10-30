---
quick_id: 261025-wba
slug: listings-paywall-rls-grace-terms
mode: quick
branch: feat/stripe-subscriptions (PR #8, stacked on feat/onboarding-paywall PR #7)
autonomous: true
---

# Quick Task 261025-wba: DB-level hard paywall, 3-day past_due grace, subscription legal copy

Guang confirmed the open items in chat on 2026-10-25 23:14 (Rome): "1–6 按推荐做, 同意7,8".
- Items 1–3 (Stripe test prices, Vercel Preview env, webhook/Portal) belong to other bots.
- Item 4 (apply 042 in production) belongs to the operator. 042 is frozen.
- This task does items 5–8, with no Stripe, Vercel or remote database access.

The first draft was written by a duplicate session (same session id, older prompt). It stopped on request, and this plan reconciles its draft with the 042-frozen rule.

## Facts that shape the design

- `listings_public` runs as its owner (`security_invoker = false`, 010/036), so table RLS alone gates nothing. The gate must live in the view too.
- `createAnonClient()` never sends the user JWT. After the gate, it would return zero rows to subscribers as well, so with the flag on, listing reads use the session client.
- Stripe advances `current_period_end` on the renewal attempt. Grace therefore anchors on when `past_due` started, not on the period end.

## Data shapes

- **043 (additive).** Adds `subscriptions.past_due_since`. `apply_subscription_state` keeps the 042 signature, stamps `past_due_since` on entering `past_due`, keeps it while `past_due`, and clears it otherwise.
- **044 (go-live only).**
  - `has_active_subscription()` takes no argument; it is STABLE, SECURITY DEFINER, with `search_path = ''`.
  - Policy `subscriber_read_active_non_expired` replaces `public_read_active_non_expired`.
  - `listings_public` gets `security_barrier` and a subscriber, author or service-role gate.
  - `listings_paywall_teaser(p_city, p_since, p_limit)` returns `(listing_count bigint, photo_urls text[])` with at most 6 photos.
- **TS.**
  - `PAST_DUE_GRACE_MS` and `isEntitled(row)` cover active/trialing with the period not ended, or past_due for under 3 days.
  - `PaywallTeaser = { count: number | null; photoUrls: string[] }`.
  - `fetchPaywallTeaser()` returns null when the function is missing, and the caller then uses `teaserFromListings()`.

## Tasks

1. Migrations 043/044, `supabase/tests/run-local.sh` (throwaway container, all migrations in order) and `044_listings_paywall_rls.check.sql`.
   - verify: run-local.sh prints CHECKS PASSED for 042 and 044.
2. App.
   - Grace rule and `select('*')` subscription reads.
   - Session read client when the flag is on.
   - Teaser RPC with fallback (home and onboarding).
   - Detail page access first.
   - Subscriber-only alert pushes.
   - Parity test between SQL and TS.
   - verify: lint/tsc (only the pre-existing error) and the full npm test.
3. Legal copy (en/it/zh), shown on flag-on builds only. Records in PRODUCT.md, HANDOFF.md and STATE. Extend the verify skill (data-layer checks, legal and teaser journeys).
   - verify: Node 22 build, Playwright flag-off/onboarding/desktop/compare, and flag-on persist.
