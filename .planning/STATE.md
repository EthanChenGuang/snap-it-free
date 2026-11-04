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
**Current focus:** Phases 2–3 verified on Preview (UAT.md, 2026-11-04). Open: onboarding map screen has no real per-item locations (see Blockers).

## Current Position

Phase: 2–3 of 4 complete **and verified** (`02-*/UAT.md`, `03-*/UAT.md`)
Plan: 1 of 1 in each completed phase
Status: in_progress (phases 1 and 4 deferred; follow-ups below)
Last activity: 2026-11-04 — Preview @ 73ca623 (includes f8d5589) deployed automatically; drive.mjs 69/69

Progress: [█████░░░░░] 50% (phases 1 and 4 deferred)

## Accumulated Context

### Decisions

- Working branch: `preview/recent-changes`. `feat/onboarding-snag`, PR #7 (`feat/onboarding-paywall`) and PR #8 (`feat/stripe-subscriptions`) are already in this branch.
- Sign-up required at the account step; no free trial at launch; do not write the EU 14-day withdrawal Terms clause.
- Stitch project `9058658661756179433` was used (Lagoon Pop + Snag weekly/map/favorites).
- Stripe webhook retargeted to the Preview alias; one successful delivery 2026-10-31. Guang made one real **annual test** purchase the same day (return page + webhooks). Webhook-only unlock (close tab after paying) is still unverified.
- d79b531 removed the post-checkout "You're in" banner/toast (commit says Guang found it annoying — confirm intent).

### Pending Todos

None in `.planning/todos/pending/`.

### Blockers/Concerns

- Resolved 2026-11-04: Preview now runs **73ca623** (`dpl_2ZA6x7HWrP4SDSYoK8dSefciCyW3`), which includes f8d5589. Weekly per-day average is live.
- **Map screen (ob4) shows one pin.** Probe 2026-11-04: all 41k active rows carry their **city-centre** coordinate (one distinct point per city), so there are no per-item positions to spread. "Every item pinned on the map" / "Distance on every card" overstate what the data has. Needs Guang's choice: city-level map (one bubble per city, real counts) or drop the map screen. Same caveat applies to distance on feed cards.
- Onboarding downloads the full active set (~41k row objects seen across its fetches) on a phone; worth a count/sample RPC later.
- Preview `drive.mjs` needs `VERCEL_SHARE_TOKEN` (env only, never a file).
- Preview shares production Supabase (`wnerhajyjjmrtsdmdpzu`): no sign-ups, no remote migrations without Guang.
- Supabase **production** email-template OTP (`{{ .Token }}` on Magic Link / Confirm) status **unknown**. Repo templates exist (`c6b410b`, local/preview). Affects production emails; needs Guang.
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
| 261031-ob4 | Snag weekly / map / favorites screens; hide listing sources | 2026-10-31 | ef22e5f (f8d5589 follow-up **not deployed**) | [261031-ob4-snag-gap-screens](./quick/261031-ob4-snag-gap-screens/) |

## Session Continuity

Last session: 2026-10-31 (code); 2026-11-03 (docs refresh)
Stopped at: Snag parity pushed; Vercel Hobby rate limit blocked deploys of f8d5589 and 068753c
Resume file: `.planning/.continue-here.md` — keep aligned with this file and `HANDOFF.md` (those two are canonical as of 2026-11-03)
