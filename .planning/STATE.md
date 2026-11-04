---
gsd_state_version: '1.0'
status: in_progress
milestone: Snag-modelled onboarding follow-ups
milestone_name: Snag-modelled onboarding follow-ups
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 2
  completed_plans: 2
  percent: 50
---

# Project State

## Project Reference

See: `.planning/ROADMAP.md`, `.planning/onboarding-snag/`, `HANDOFF.md` (no `PROJECT.md` in this repo).

**Core value:** Honest Snag-modelled onboarding that drives sign-up and paid conversion for Snap-it-free (zerodollar), with every number from real data.
**Current focus:** Phases 2–3 verified. Quick 261104-ob5 (city-level map + onboarding every visit on Preview) shipped and verified on Preview. Open: webhook-only test, Supabase email OTP (needs a Supabase access token).

## Current Position

Phase: 2–3 of 4 complete **and verified** (`02-*/UAT.md`, `03-*/UAT.md`)
Plan: 1 of 1 in each completed phase
Status: in_progress (phases 1 and 4 deferred; follow-ups below)
Last activity: 2026-11-04 — quick 261104-ob5 (87ac2ca + label fix) on Preview; drive.mjs onboarding 70/70, persist 9/9

Progress: [█████░░░░░] 50% (phases 1 and 4 deferred)

## Accumulated Context

### Decisions

- **Guang 2026-11-04:** `preview/recent-changes` is the **only** working branch (no other branches). Map → city-level (done, ob5). Non-subscribers see onboarding every visit on non-production builds (done, ob5). Removing the "You're in" banner (d79b531) **was his intent**. Authorized the additive OTP line in the production Supabase email templates.
- Working branch: `preview/recent-changes`. `feat/onboarding-snag`, PR #7 (`feat/onboarding-paywall`) and PR #8 (`feat/stripe-subscriptions`) are already in this branch.
- Sign-up required at the account step; no free trial at launch; do not write the EU 14-day withdrawal Terms clause.
- Stitch project `9058658661756179433` was used (Lagoon Pop + Snag weekly/map/favorites).
- Stripe webhook retargeted to the Preview alias; one successful delivery 2026-10-31. Guang made one real **annual test** purchase the same day (return page + webhooks). Webhook-only unlock (close tab after paying) is still unverified.
- d79b531 removed the post-checkout "You're in" banner/toast — confirmed as Guang's intent (2026-11-04).

### Pending Todos

None in `.planning/todos/pending/`.

### Blockers/Concerns

- Resolved 2026-11-04: Preview now runs **73ca623** (`dpl_2ZA6x7HWrP4SDSYoK8dSefciCyW3`), which includes f8d5589. Weekly per-day average is live.
- Resolved 2026-11-04 (ob5): map screen is now city-level (one bubble per city, real counts). Root cause: only Subito is enabled and it has no coordinates, so rows fall back to the city centre. Wallapop (per-item coords) stays disabled. Feed-card distance from a city centre is still approximate.
- Onboarding downloads the full active set (~41k row objects seen across its fetches) on a phone; worth a count/sample RPC later.
- Preview `drive.mjs` needs `VERCEL_SHARE_TOKEN` (env only, never a file) and `PLAYWRIGHT_CORE=/opt/node-tools/node_modules/playwright` in cloud sessions.
- Preview shares production Supabase (`wnerhajyjjmrtsdmdpzu`): no sign-ups, no remote migrations without Guang.
- Supabase production emails carry only the link (no code); body is not editable without custom SMTP. Pre-launch decision (HANDOFF §3.3). App copy no longer promises a code.
- Local `.env.local` historically lacked real Supabase public vars (older local drive 59/61 + 3 SKIP). Post-ob4 local baseline was not re-recorded.

## Deferred Items

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| phase | 1 Consent-gated onboarding funnel analytics | deferred | 2026-10-29 | Snag-modelled onboarding follow-ups |
| phase | 4 Server-side marketing opt-in | deferred | 2026-10-29 | Snag-modelled onboarding follow-ups |
| infra | Teaser migration 045 | deferred | 2026-10-29 | Snag-modelled onboarding follow-ups |
| product | 7-day trial A/B (post-launch) | deferred | 2026-10-25 | Snag-modelled onboarding follow-ups |

## Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 261025-s0z | Flagged onboarding + hard paywall UI (Part 1) | 2026-10-25 | (see git log) | [261025-s0z-onboarding-paywall-flow](./quick/261025-s0z-onboarding-paywall-flow/) |
| 261025-vwf | Stripe test-mode subscriptions (Part 2) | 2026-10-25 | (see git log) | [261025-vwf-stripe-test-mode-subscriptions](./quick/261025-vwf-stripe-test-mode-subscriptions/) |
| 261025-wba | DB hard paywall RLS (044), 3-day past_due grace (043), subscription legal copy | 2026-10-26 | (see git log) | [261025-wba-listings-paywall-rls-grace-terms](./quick/261025-wba-listings-paywall-rls-grace-terms/) |
| 261026-3w6 | Structured Stripe route errors (502/500 JSON), signed-in locked card shows Refresh status | 2026-10-26 | (see git log) | [261026-3w6-stripe-route-errors-paywall-signed-in](./quick/261026-3w6-stripe-route-errors-paywall-signed-in/) |
| 261028-ob2 | Snag-modelled 10-screen onboarding + honest personalized paywall; 261029 follow-up | 2026-10-29 | 5a9618e | [261028-ob2-onboarding-snag-redesign](./quick/261028-ob2-onboarding-snag-redesign/) |
| 261030-ob3 | Colorful "Lagoon Pop" onboarding + paywall redesign from Stitch (preview only) | 2026-10-30 | 3e3280a | [261030-ob3-colorful-onboarding](./quick/261030-ob3-colorful-onboarding/) |
| 261031-ob4 | Snag weekly / map / favorites screens; hide listing sources | 2026-10-31 | ef22e5f, f8d5589 | [261031-ob4-snag-gap-screens](./quick/261031-ob4-snag-gap-screens/) |
| 261104-ob5 | City-level onboarding map (real counts); onboarding every visit for non-subscribers off production | 2026-11-04 | 87ac2ca | [261104-ob5-city-map-every-visit](./quick/261104-ob5-city-map-every-visit/) |

## Session Continuity

Last session: 2026-11-04 (Claude Code)
Stopped at: ob5 shipped + verified on Preview; waiting on Guang for the webhook-only test and a Supabase access token
Resume file: `.planning/.continue-here.md` — keep aligned with this file and `HANDOFF.md` (those two are canonical as of 2026-11-03)
