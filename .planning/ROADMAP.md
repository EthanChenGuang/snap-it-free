# ROADMAP — onboarding-snag remaining (HANDOFF §3)

Milestone: **Snag-modelled onboarding follow-ups** on `preview/recent-changes`.
Phases 2 and 3 are **complete and verified** on Preview @ 73ca623 (`UAT.md` in each phase, 2026-11-04). Phases 1 and 4 stay deferred. No new phases.

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 1 | Consent-gated onboarding funnel analytics | deferred | Needs Guang: provider + cookie-consent. Out of this run. |
| 2 | Post-purchase "You're in" + choices applied | complete | PROPOSAL P10. Banner/toast later removed in d79b531 (Guang's intent, confirmed 2026-11-04). Verified (UAT.md). Guang made one annual Stripe test purchase on 2026-10-31 (return page + webhooks). Webhook-only unlock still unverified. |
| 3 | Locked feed: search and filters stay usable | complete | PROPOSAL P10 soften. Lock only detail + favorites. Verified (UAT.md). |
| 4 | Server-side marketing opt-in | deferred | Needs DB column + remote migration. Ask Guang. |

Done outside phases: quick 261104-ob5 — city-level onboarding map (Guang chose it 2026-11-04) and onboarding every visit for non-subscribers on Preview. Phase 2 note: removing the banner was Guang's intent (confirmed 2026-11-04).

Open (not phases here): webhook-only unlock test (new test account, Guang's OK); Supabase production email OTP (authorized 2026-11-04; needs a Supabase access token in the session); teaser migration 045; 7-day trial A/B; landing this branch on `main` (Guang's call). Migration 044 + `NEXT_PUBLIC_PAYWALL_ENABLED=true` ship together — **Guang only**.

### Phase 5: Chinese contact assistant

**Goal:** A zh/en user can contact an Italian seller without knowing Italian: an in-app sheet with ready Italian messages (copy + open seller's page) and a reply translator.
**Requirements**: `phases/05-chinese-contact-assistant/CONTEXT.md`
**Depends on:** Nothing. Branch `preview/recent-changes` only; not merged to `main` until Guang says so.
**Plans:** 1 plan

Plans:
- [ ] `phases/05-chinese-contact-assistant/PLAN.md`

(Numbered 5 because 4 is the deferred "Server-side marketing opt-in" in the table above.)
