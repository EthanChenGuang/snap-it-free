# HANDOFF — feat/onboarding-paywall (GSD quick 261025-s0z) — WORK IN PROGRESS

Pre-browse onboarding (3–4 intro screens) + paywall UI, Snag-inspired, behind a feature flag that is OFF by default.
Task spec: `.planning/quick/261025-s0z-onboarding-paywall-flow/TASK-PROMPT.md`. Competitor analysis: `.../SNAG-ANALYSIS.md`. Plan: `.../261025-s0z-PLAN.md`.

## Done
- Commit 1 (`lib/paywall/*`): pure gate (`gate.ts`: `NEXT_PUBLIC_PAYWALL_ENABLED==='true'` or `?onboarding=1`, versioned localStorage completion key, SSR-safe), placeholder plan config (`plans.ts`, weekly/monthly/yearly, yearly highlighted, `TODO: pending Guang's pricing decision`), real-data teaser helper (`teaser.ts`, reuses feed city predicate), flow reducer (`onboarding-flow.ts`). 34 vitest tests pass in `lib/paywall`.
- Commit 2 (WIP, UI not yet verified): `components/onboarding/{OnboardingGate,OnboardingFlow,PaywallScreen,SymbolIcon}.tsx`, mounted as `<OnboardingGate />` in `app/page.tsx`; iOS install-guide auto-open is suspended while onboarding is open (`PwaOnboardingProvider` + `IosGuideAutoOpen` `suspended` prop); i18n strings in `messages/{en,it,zh}.ts`.

## Next
1. Review the UI components for completeness against TASK-PROMPT.md (paywall CTA must only show "coming soon" then continue; close button visible immediately; "Continue for free"; price + auto-renewal text; Restore/Terms/Privacy links; no fake counts).
2. Create the project verify skill (`/create-verification-skill`), then run `npm run lint`, `npm test`, `npm run build`, `npm run start`, and drive the flow with Playwright at 390x844 using `?onboarding=1`; screenshots to `/workspace/snag-research/ours/` (box). Prove the flag-off home page is unchanged and completion persists.
3. Mark the PR ready only after verification; remove this file in the last commit before merge.

## How to verify
- `npx vitest run lib/paywall` (34 passing at WIP commit).
- `npx tsc --noEmit`: one pre-existing error in `lib/favorites/store.test.ts:56` (exists on main, unrelated).
- Local run needs `.env.local` with the public Supabase URL + publishable key (not committed).

## Open questions for Guang
- Real prices (placeholders now: €1.99/week, €4.99/month, €19.99/year).
- Payment provider: Stripe web checkout vs App Store / Play billing (PWA today).
- Enable in production? PRODUCT.md currently lists the paywall as out of scope and "stay free" — this is a product-direction decision.
- Gate strictness: soft paywall (always a free browse path, as built) vs locking features.
