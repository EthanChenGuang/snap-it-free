# ROADMAP — onboarding-snag remaining (HANDOFF §3)

Milestone: **Snag-modelled onboarding follow-ups** on `preview/recent-changes`.
Phases 2 and 3 are **complete and verified** on Preview @ 73ca623 (`UAT.md` in each phase, 2026-11-04). Phases 1 and 4 stay deferred. No new phases.

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 1 | Consent-gated onboarding funnel analytics | deferred | Needs Guang: provider + cookie-consent. Out of this run. |
| 2 | Post-purchase "You're in" + choices applied | complete | PROPOSAL P10. Banner/toast later removed in d79b531 (confirm Guang's intent). Verified (UAT.md). Guang made one annual Stripe test purchase on 2026-10-31 (return page + webhooks). Webhook-only unlock still unverified. |
| 3 | Locked feed: search and filters stay usable | complete | PROPOSAL P10 soften. Lock only detail + favorites. Verified (UAT.md). |
| 4 | Server-side marketing opt-in | deferred | Needs DB column + remote migration. Ask Guang. |

Open (not phases here): onboarding map screen has only city-centre coordinates (Guang to choose city-level map or drop it); webhook-only unlock test (new test account, Guang's OK); Supabase production email OTP (status unknown, needs Guang); teaser migration 045; 7-day trial A/B; landing this branch on `main` (Guang's call). Migration 044 + `NEXT_PUBLIC_PAYWALL_ENABLED=true` ship together — **Guang only**.
