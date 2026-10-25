# HANDOFF: feat/onboarding-paywall (GSD quick 261025-s0z)

Pre-browse onboarding plus a **hard** paywall for 零元 / ZeroDollar, behind `NEXT_PUBLIC_PAYWALL_ENABLED` (off by default). Part 1 of the monetization work. Stripe is Part 2 on `feat/stripe-subscriptions`.

## Decisions recorded (Guang, 2026-10-25)

- Prices €1.99 / week, €4.99 / month, €19.99 / year. They live in `lib/paywall/plans.ts` and the placeholder TODO is gone.
- Payments go through Stripe on the web (Checkout + Customer Portal), built in test mode first. App Store / Play billing is deferred.
- The gate is hard. With the flag on, a non-subscriber sees no real listings. A blurred preview of real photos and the real count are allowed.
- Production is the eventual target. PRODUCT.md now has a Monetization section and no longer lists the paywall as out of scope.
- This reverses two "reject" items in `.planning/quick/261025-s0z-onboarding-paywall-flow/SNAG-ANALYSIS.md` (hard paywall, blurred feed). The honesty rules still hold: real counts, real photos, price and renewal next to the CTA, close always visible.

## Done

- `lib/paywall/`. `gate.ts` holds the onboarding gate (flag or `?onboarding=1`, versioned completion key, SSR-safe) and `resolveListingAccess` (`open | locked`). `server-access.ts` provides `getListingAccess()`: flag off with no preview returns `open` before any I/O, and `getSubscriptionActive()` is the Part 2 seam (returns `false` here). The directory also has `plans.ts`, `teaser.ts`, `locked-preview.ts` and the `onboarding-flow.ts` reducer.
- `components/onboarding/`. These are the flow, paywall, standalone paywall dialog, overlay shell and locked views.
- Server-side enforcement:
  - `/` renders `LockedFeed` with only the real count and 6 `{id, photoUrl}` pairs. No listing payload reaches the browser.
  - `/listing/[id]` is locked except for the owner's own UGC.
  - `/favorites` is locked on flag-on builds.
- The paywall has no "Continue for free". Close is visible immediately and lands on the locked view. The CTA shows "Payments aren't enabled yet" and charges nothing.
- The iOS install-guide auto-open is suspended while onboarding is open.
- All strings exist in en/it/zh.
- Project verify skill at `.claude/skills/verify-snap-it-free/` covers launch, doctor, drive, cleanup and a feature map.

## How to verify

```
npm run lint             # 1 error, pre-existing on main: lib/favorites/store.test.ts:56
npx tsc --noEmit         # same single pre-existing error
npm test                 # 118 files, 712 tests passed
export VERIFY_NODE_DIR=/tmp/verify-tools/node_modules/node/bin   # Node 22, see below
S=.claude/skills/verify-snap-it-free/scripts
$S/launch.sh --build --flag off     # prints RUN_DIR and URL
node $S/drive.mjs flag-off --url $URL --out /workspace/snag-research/ours          # 3/3
node $S/drive.mjs onboarding --url $URL --out /workspace/snag-research/ours        # 33/33
node $S/drive.mjs desktop-paywall --url $URL --out /workspace/snag-research/ours   # 2/2
node $S/drive.mjs compare --base $MAIN_URL --url $URL --out /tmp/verify-snap-it-free/compare  # 2/2, DOM identical to main
$S/launch.sh --build --flag on && node $S/drive.mjs persist --url $URL --out /workspace/snag-research/ours  # 6/6
$S/cleanup.sh $RUN_DIR
```

- With the flag off, the home DOM is identical to `origin/main` (57,751 chars each) and the two 390x844 screenshots differ in 0 pixels.
- Screenshots are in `/workspace/snag-research/ours/`. They are outside the repo and not committed.
- **Node 22 is required to build.** `npm run build` fails on Node 20 for `main` too: `navigator is not defined` while prerendering `/favorites`, from `PwaOnboardingProvider` calling `needsIosInstallGuide()` during render. CI uses Node 22. Making that provider SSR-safe is a separate small fix and is not done here.

## Next

- Part 2 (`feat/stripe-subscriptions`) adds the `subscriptions` table, webhooks, Checkout, Portal and the real `getSubscriptionActive()`.
- Data-level enforcement is not done. `listings_public` is still readable with the anon key, and the onboarding city teaser reads it client-side. Making the hard gate airtight needs RLS or an RPC change. That is a decision for Guang.
- The flag-on first visit paints the locked feed, then the onboarding overlay after hydration. There is no flash of real listings, but there is a brief locked frame first.

## Open questions for Guang

- Is a blurred preview of 6 real photos plus the total count the teaser you want, or should it be stricter or looser?
- Should a non-subscriber keep any free path at all (search, map pins, alerts)? At the moment alerts and settings stay reachable.
- What is the timeline for tightening `listings_public` RLS? Without it the gate is UI-level only.
