# ROADMAP — onboarding-snag remaining (HANDOFF §3)

Milestone: **Snag-modelled onboarding follow-ups** on `preview/recent-changes`.
Phases 2 and 3 are **complete in code**. There are **no** `VERIFICATION.md` / `UAT.md` files — `/gsd-verify-work` is pending after Preview redeploy of HEAD. Phases 1 and 4 stay deferred. No new phases.

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 1 | Consent-gated onboarding funnel analytics | deferred | Needs Guang: provider + cookie-consent. Out of this run. |
| 2 | Post-purchase "You're in" + choices applied | complete | PROPOSAL P10. Banner/toast later removed in d79b531 (confirm Guang's intent). **No `VERIFICATION.md` / `UAT.md`.** Guang made one annual Stripe test purchase on 2026-10-31 (return page + webhooks). Webhook-only unlock still unverified. |
| 3 | Locked feed: search and filters stay usable | complete | PROPOSAL P10 soften. Lock only detail + favorites. **No `VERIFICATION.md` / `UAT.md`.** |
| 4 | Server-side marketing opt-in | deferred | Needs DB column + remote migration. Ask Guang. |

Blocked (not phases here): Preview redeploy of f8d5589 / 068753c (Vercel Hobby `Deployment rate limited — retry in 24 hours` on 2026-10-31; live Preview is still ef22e5f); webhook-only unlock test (new test account, Guang's OK); Supabase production email OTP (status unknown, needs Guang); teaser migration 045; 7-day trial A/B; landing this branch on `main` (Guang's call). Migration 044 + `NEXT_PUBLIC_PAYWALL_ENABLED=true` ship together — **Guang only**.
