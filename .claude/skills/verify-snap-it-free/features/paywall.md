# Hard paywall and locked views

Paywall after onboarding and from "See plans". Weekly €1.99, monthly €4.99, yearly €19.99 (preselected, "Best value"). Close is visible at once. There is no free path to real listings. Without Stripe configured the CTA shows "Payments aren't enabled yet" and charges nothing.

## Sub-features

- `pw-plans` three radio cards, per-week equivalent, renewal text follows the selection.
- `pw-links` Restore (honest nothing-to-restore message), `/terms`, `/privacy` in a new tab.
- `pw-cta` coming-soon state, then Close lands on the locked feed.
- `lock-home` `/` for a non-subscriber: real total count and 6 blurred real photos, no listing links, no listing payload in HTML.
- `lock-detail` `/listing/<id>` locked (owner view of own UGC exempt). `lock-favorites` `/favorites` locked (flag-on builds only).

## How to get to it (user POV)

- Finish or skip onboarding.
- Tap "See plans" on any locked view.
- Preview on a flag-off build with `?onboarding=1` on `/` or `/listing/<id>`.

## Driving it with drive.mjs

Preconditions: doctor OK.

- **Paywall.** The `onboarding` journey asserts `[data-testid=paywall-close]` visible, 3 radios, `paywall-plan-yearly` checked, `paywall-renewal` text, link hrefs, and the CTA coming-soon text.
- **Locked.** It then asserts `[data-testid=locked-feed]`, zero `a[href^="/listing/"]`, and `[data-testid=locked-detail]` for a real id read from the open feed.
- **Desktop.** `desktop-paywall` asserts the card is at most 440px wide at 1280x800.

## Gotchas

- The gate is UI and SSR only. `listings_public` stays readable with the anon key until RLS changes.
- `/favorites` deliberately ignores `?onboarding=1` so it stays a static page with the flag off.
