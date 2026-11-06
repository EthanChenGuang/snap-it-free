# Hard paywall and locked views

Paywall after onboarding and from "See plans". Weekly €1.99, monthly €4.99, yearly €19.99 (preselected, "Best value"). Close is visible at once. There is no free path to real listings. Without Stripe configured the CTA shows "Payments aren't enabled yet" and charges nothing.

## Sub-features

- `pw-plans` three radio cards, per-week equivalent, renewal text follows the selection.
- `pw-links` Restore calls `GET /api/subscription`: a guest is asked to sign in, a signed-in non-subscriber sees nothing-to-restore, and a subscriber reloads into the open feed. `/terms` and `/privacy` open in a new tab.
- `pw-cta` CTA posts `/api/stripe/checkout`: 503 (no Stripe env) shows coming soon, 401 asks to sign in, 200 redirects to Stripe Checkout, and 502 `stripe_error` / 500 `internal_error` show "Couldn't start checkout" with the CTA still enabled for a retry. Close lands on the locked feed.
- `lock-account` Under "See plans" on every locked view, a guest gets "Already subscribed? Sign in" (link to `/settings`). A signed-in user gets "Refresh status" instead, which re-checks `GET /api/subscription` and reloads if active, or explains that nothing is active yet. Nothing renders while the session is loading.
- `stripe-errors` Checkout and portal routes answer JSON on any throw: Stripe SDK errors give 502 `stripe_error`, anything else 500 `internal_error`. Each logs one `[stripe] <route> failed {type, code, message}` line with keys redacted. The return route still redirects to `?checkout=pending`.
- `lock-home` `/` for a non-subscriber: real total count and 6 blurred real photos, no listing links, no listing payload in HTML.
- `lock-detail` `/listing/<id>` locked (owner view of own UGC exempt). `lock-favorites` `/favorites` locked (flag-on builds only).

- `db-gate` (migration 044, go-live only): anon and non-subscribers read zero rows from `listings_public` and `listings`. Subscribers (active/trialing, or past_due under 3 days) and authors read theirs. `listings_paywall_teaser()` returns only `(listing_count, photo_urls)`. Proved by `supabase/tests/run-local.sh`, not by the browser journeys, which run against a remote database without 044.
- `legal` Terms and Privacy show subscription, cancellation, Stripe and stored-data sections only on flag-on builds.

## How to get to it (user POV)

- Finish or skip onboarding.
- Tap "See plans" on any locked view.
- Preview on a flag-off build with `?onboarding=1` on `/` or `/listing/<id>`.

## Driving it with drive.mjs

Preconditions: doctor OK.

- **Paywall.** The `onboarding` journey asserts `[data-testid=paywall-close]` visible, 3 radios, `paywall-plan-yearly` checked, `paywall-renewal` text, link hrefs, and the CTA coming-soon text.
- **Locked.** It then asserts `[data-testid=locked-feed]`, zero `a[href^="/listing/"]`, and `[data-testid=locked-detail]` for a real id read from the open feed.
- **Errors.** `onboarding` stubs `/api/stripe/checkout` with a 502 via `page.route`, asserts `[data-testid=paywall-checkout-error]` and an enabled CTA, then unroutes and retries into coming soon. It also asserts the guest sign-in link on the locked feed. The signed-in "Refresh status" branch needs a real session, so it is covered by `components/onboarding/LockedViews.test.tsx`, not the browser.
- **Desktop.** `desktop-paywall` asserts the card is at most 440px wide at 1280x800.

## Gotchas

- A real Checkout redirect needs Stripe test env (`STRIPE_*`) plus `SUPABASE_SERVICE_ROLE_KEY` and a signed-in user. Without them the journey proves the 503 path only.

- Until 044 is applied the gate is UI and SSR only, and `listings_public` stays readable with the anon key. After 044 the browser and server read listings with the user's session when the flag is on. A subscriber whose session has expired sees an empty feed until it refreshes.
- `/favorites` deliberately ignores `?onboarding=1` so it stays a static page with the flag off.
