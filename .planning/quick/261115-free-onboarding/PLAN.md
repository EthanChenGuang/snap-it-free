# PLAN — quick 261115: free onboarding (onboarding without the paywall)

Guang (2026-11-15, option B): production should show the onboarding/marketing flow on first
open, but **not charge yet**. Today one flag (`NEXT_PUBLIC_PAYWALL_ENABLED`) switches on both
onboarding and the hard paywall. Split them.

Plan: Fable. Build: Sonnet. Review: Opus.

## Behaviour

| `PAYWALL_ENABLED` | `ONBOARDING_ENABLED` | Result |
|---|---|---|
| true | any | Unchanged: onboarding → paywall, locked feed, Stripe (today's Preview). |
| not true | true | **Free onboarding**: same intro steps, no paywall screen, feed fully open. |
| not true | not true | Unchanged: no onboarding (today's production). |

Free onboarding:
- Steps are the existing `INTRO_STEPS`; after the last one (alerts, or account when alerts are
  unavailable) the flow **finishes** and applies the choices (city / interests / radius) to the
  feed exactly as finishing after the paywall does. The paywall screen is never reachable.
- Sign-up at the account step stays **required** (Guang's standing decision, 2026-10-28).
  A visitor who is already signed in must not be asked to sign up again.
- Once per browser in production (existing rule). `?onboarding=1` re-shows it and, in free
  mode, must NOT lock the feed.
- **No paid wording anywhere in free mode**: no price, plan, "Plus", subscription, trial,
  unlock/locked, "members". Audit every intro step in zh/en/it; where a string sells the paid
  product, add a free-mode variant (honest: items are free to browse; no fake numbers; no
  source marketplace names). Keep paid mode's copy byte-identical.
- Paywall flag semantics elsewhere do not change: listing access, anon vs session client,
  SubscriptionSection, Terms/Privacy, alerts entitlement, translate API all keep reading
  `isPaywallFlagEnabled()` only.

## Tasks

1. `lib/paywall/gate.ts`: `isOnboardingFlagEnabled()` reading the literal
   `process.env.NEXT_PUBLIC_ONBOARDING_ENABLED === 'true'`; `isFreeOnboarding()` =
   onboarding flag on and paywall flag off; `resolveOnboardingGate` shows the flow when either
   flag is on. In free mode the `?onboarding=1` preview does not turn listing access to
   `locked` (`lib/paywall/server-access.ts` / `resolveListingAccess`). Tests for the table above.
2. `lib/paywall/onboarding-flow.ts`: the reducer/screen order takes a `withPaywall` option
   (default true = today). Without it, `next` from the last intro step and any `goTo paywall`
   lead to `done`. Tests: both modes, alerts-unavailable path, resume state that points at
   `paywall` in free mode.
3. `components/onboarding/OnboardingFlow.tsx` (+ gate): pass the mode, never mount
   `PaywallScreen` or fetch paywall-only data in free mode, finish applies choices and marks
   onboarding completed. Already-signed-in visitor: account step is skipped or shows as done.
4. Copy audit + free-mode variants in `messages/{zh,en,it}.ts` (key parity).
5. Tests for the flow in free mode (component level), existing suites unchanged and green.
6. Verify with a real production-style build:
   `NEXT_PUBLIC_ONBOARDING_ENABLED=true` and no paywall flag. Drive with Playwright at 390x844,
   zh: every step up to the account step (do NOT create accounts), assert no paid wording in
   the DOM of any step, `/` without the flow afterwards shows the open feed, and with both
   flags off the flow does not show. Screenshots of each step in `screens/`. Restore
   `public/sw.js`. Write `SUMMARY.md` (what changed, how to switch it on, what is unverified).

## Done when

- Flags behave as in the table; paid mode and no-onboarding mode are unchanged (tests prove it).
- Free mode has no paid wording and no path to the paywall.
- Own commit(s), no dependency on phase-5 files (will be cherry-picked onto `main`).
