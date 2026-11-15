# SUMMARY — quick 261115: free onboarding

## What changed
- `lib/paywall/gate.ts`: `isOnboardingFlagEnabled()` (literal `process.env.NEXT_PUBLIC_ONBOARDING_ENABLED`), `isFreeOnboarding()`
  (onboarding on, paywall off); `resolveOnboardingGate` shows the flow when either flag is on.
- `lib/paywall/server-access.ts`: in free mode `?onboarding=1` no longer previews the hard gate, so the feed stays open.
- `lib/paywall/onboarding-flow.ts`: optional `withPaywall` on the state (default true). With `false`, `next` past the last intro
  step and `goTo paywall` end in `done`; a resume state pointing at `paywall` (or `alerts` without push) also ends in `done`.
- `OnboardingFlow.tsx`: free mode starts the reducer with `withPaywall: false`, never mounts `PaywallScreen`, hides "See plans",
  shows the trust step's free rows, un-blurs the preview photos (no lock icon) and labels them "Free". Finish already applied
  city/interests/radius and marked onboarding completed.
- `.env.example`: `NEXT_PUBLIC_ONBOARDING_ENABLED` with a comment.

## Free-mode strings (zh)
- `onboarding.trust.freeRows` (new, replaces the last two paid rows of `trust.rows` in free mode): rows 1-2 are the same as paid;
  3 `浏览免费` / `浏览物品完全免费。`; 4 `取货由你们直接约定` / `我们帮你找到物品，取货时间和地点由你和发布者直接商量。`
  (en and it equivalents added). Paid rows (price, auto-renewal, Stripe) are untouched.
- Preview photo badge: `€0` -> `messages.listing.free` (`免费`) in free mode; lock icon and blur removed in free mode.
- Hook step: the decorative `€0` sticker is not rendered in free mode (the `★ 免费` sticker stays).
- Alerts example: tile text `0€` -> `免费` in free mode.
- Not shown in free mode: `preview.seePlans` (查看方案). `account.payingAs` only appears on the paywall, which is unreachable.
- Deviation note: the three `€` stickers are decorative "free" marks, not a price, but `€` is on the audit list, so they have free variants.

## Account step for an already signed-in visitor
Read from `AccountStep.tsx`: it is NOT skipped. A signed-in user (or the QA stub, never in production) sees the confirmation card
("已登录：email", with "not you? switch account") and a Continue button; the sign-in options are hidden, so they are not asked to
sign up again. Signed-out visitors cannot pass it (no Continue, no "Not now"). Covered by a component test with a mocked session; no
account was created.

## How to switch on
Build-time: `NEXT_PUBLIC_ONBOARDING_ENABLED=true` and `NEXT_PUBLIC_PAYWALL_ENABLED` unset/not `true`. Paywall `true` = today's paid
flow whatever the onboarding flag says; both off = no onboarding.

## Verified
- Tests: new reducer, gate, `getListingAccess` and component tests (zh/en/it, every step up to account, plus signed-in finish).
- Production build with the onboarding flag only, Playwright 390x844, zh: all 11 steps up to the account step, none contain any listed
  paid word (plus `stripe`, `价格`, `方案`, `付款`, `locked`), no horizontal overflow, no paywall in the DOM, Continue absent when signed
  out; after setting the completed flag `/` shows the open feed with no overlay; `/?onboarding=1` re-shows the flow over an unlocked feed.
  A second build with both flags off: no overlay on `/`. Screenshots in `screens/`.

## Not verified
- Real sign-up / code / Google round trip and the finish after the alerts step in a real browser (needs an account; none created).
- Paid mode in a browser (only covered by the existing and new unit/component tests).
- The preview-step photos are blank in screenshots because the sandbox cannot reach the image CDN.
- Trust step icons (receipt, lock) are fixed per row index and now sit on the free rows; cosmetic only.
- `launch.sh` of the verify skill cannot pass the onboarding flag; the builds were run by hand with the env set.

## Update: skippable account step (owner decision, free mode only)
- `AccountStep` takes an optional `onSkip`; `OnboardingFlow` passes it only in free mode. A signed-out visitor sees a text-style
  ghost button below the sign-in options (zh `稍后再说`, en `Not now`, it `Non ora`; new key `onboarding.account.notNow`; 44px high).
  Signed-in visitors see Continue and no skip; paid mode never gets the control (sign-up stays required there).
- Alerts for a signed-out visitor: `requestPushPermissionAndSubscribe()` returns `not_logged_in` without a session (and `/api/push/subscribe`
  needs auth), so enabling alerts cannot work. "Not now" therefore finishes the flow directly instead of showing an alerts step that fails.
  The finish effect applies city/interests/radius, writes the completed flag and clears resume state as before.
- Copy: the account heading/subtitle say "free account … saves your preferences", nothing says it is mandatory; unchanged.
- Verified in a production-style build (onboarding flag only, Playwright 390x844 zh): first-time visit shows the flow; at the account step
  the skip button is 44px high and there is no horizontal overflow; tapping it closes the flow onto the open feed with the chosen city
  (帕多瓦) applied and the completed flag set; reload shows no flow; a browser with `shoumanwu_filter_prefs` set gets no flow and the flag
  is written. Screenshots `11-account.png` (with the control) and `20-feed-after.png` retaken.
- Not verified: a real sign-in after skipping (later sign-in from Settings); the picked interest chip did not produce a category filter in that
  run (`categories: []`, existing mapping behaviour, not touched here).
