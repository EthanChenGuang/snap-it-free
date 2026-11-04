# HANDOFF: `preview/recent-changes` (refreshed 2026-11-03)

Canonical with `.planning/STATE.md` and `.planning/ROADMAP.md`. `.planning/.continue-here.md` is the resume checkpoint; if it disagrees, trust this file and STATE.

## 1. Context

- **Working branch:** `preview/recent-changes` (newer rule from `.planning/.continue-here.md`). Do not treat `feat/onboarding-snag` as current.
- **History already in this branch:** `feat/onboarding-snag`, PR #7 (`feat/onboarding-paywall`), PR #8 (`feat/stripe-subscriptions`). They are merged here; they are **not** landed on `main`. How (or whether) this stack reaches `main` is Guang's call.
- **Expected git head at last code session:** `068753c` (Claude Code, 2026-10-31). Docs refresh sits on top of that.
- **Live Preview = 73ca623** (`dpl_2ZA6x7HWrP4SDSYoK8dSefciCyW3`, auto-deployed on push; includes f8d5589). Any push to this branch deploys a Preview — mind the Hobby cap of 100/day.
- **Goal:** Snag-modelled onboarding that drives sign-up and paid conversion, honestly. Flow now includes weekly / map / favorites (quick 261031-ob4) plus the earlier 10-screen spine.
- **Design docs:** `.planning/onboarding-snag/{PROPOSAL,SPEC}.md`; `.planning/quick/261028-ob2-*`, `261030-ob3-*`, `261031-ob4-*`; `.planning/phases/02-youre-in-after-purchase/` and `03-locked-feed-search-filters/` (PLAN + SUMMARY only; **no UAT/VERIFICATION**).
- **Stitch:** project `9058658661756179433` was used (Lagoon Pop + Snag gap screens). Stitch design work is in-scope; do not claim there is no Stitch project or that Stitch must not be called.
- **Guang's decisions still in force:** account-step sign-up **required**; no free trial at launch; do **not** write the EU 14-day withdrawal clause; QA account-skip stub in non-production only.
- **Infra:** Preview project `zerodollar` / team `chenguangregis-gmailcoms-projects` (`prj_I7t3oeWwE9F8EJT1q04RGWUBUfI8`, team `team_tHRDIP8AtALXIH4nKvMjUBwg`). Branch alias: https://zerodollar-git-preview-2efe87-chenguangregis-gmailcoms-projects.vercel.app — add `?onboarding=1` to force onboarding. Preview and production share one Supabase DB (`wnerhajyjjmrtsdmdpzu`). Production https://zerodollar-blond.vercel.app is untouched.

## 2. Done

On `preview/recent-changes` (on top of `main` @ 2373352), including history from PRs #7/#8 and `feat/onboarding-snag`:

- Flagged onboarding + hard paywall, Stripe test-mode Checkout/Portal/webhook, subscriptions table, 3-day `past_due` grace, migration **044** (not applied to the shared DB without Guang), subscription Terms/Privacy (flag-on builds).
- Snag-modelled onboarding UI (ob2), Lagoon Pop redesign from Stitch (ob3), Snag weekly/map/favorites + listing sources hidden (ob4, **ef22e5f**, on Preview).
- **f8d5589** map pin spread (~100 m cells) + weekly **per-day average** / busiest-day highlight: **pushed, not on Preview**.
- Inline paywall sign-in (Google + email code), "already subscribed" loop fix, switch-account ("Not you?"), fast first feed load + searching state (ca0464d).
- Stripe webhook endpoint retargeted from the old `feat/stripe-subscriptions` alias to this Preview alias (automation bypass already on). **One successful test-mode delivery** 2026-10-31. Signing secret unchanged; no webhook redeploy needed for the URL retarget.
- Guang made **one real annual Stripe test purchase** on 2026-10-31. Unlock went through the **return page and the webhooks**. The **webhook-only** path (pay, close tab, never hit `success_url`) is still unverified.
- **d79b531** dropped the post-checkout "You're in" banner and toast; `?checkout=` is still stripped. Confirm this was Guang's intent (open question).
- Repo email templates with sign-in code (`c6b410b`, `supabase/templates/*`) for local/preview-branch config. **Production dashboard OTP line status unknown.**
- Phases **2** and **3** marked complete in ROADMAP/SUMMARYs. **No** `VERIFICATION.md` or `UAT.md`. Last recorded Preview `drive.mjs onboarding` at ef22e5f: **69/69**.

No remote migration, no production deploy, no `main` push from this work.

## 3. Next (ordered)

1. ~~Redeploy + verify phases 2–3~~ **Done 2026-11-04**: drive.mjs 69/69 on 73ca623, `UAT.md` in both phases. The share token comes from Vercel MCP `get_access_to_vercel_url` (agents can mint it; env only, never committed). **New:** the onboarding map screen shows one pin because every listing carries its city-centre coordinate — Guang to choose a city-level map (bubbles per city, real counts) or dropping the screen; also reword "Distance on every card".
2. **Webhook-only unlock test** (Stripe test card `4242 4242 4242 4242`) on a **new never-subscribed test account**. Close the tab on Stripe's success screen; reopen Preview; feed must unlock from the webhook alone. **Needs Guang's OK** (shared DB — no sign-ups without him).
3. **Supabase email OTP** (Dashboard → Authentication → Email Templates → Magic Link / Confirm): additive `<p>Or enter this code in the app: <strong>{{ .Token }}</strong></p>` under the existing link. Affects **production** emails. Status of the live templates is **unknown**; **needs Guang** (or a session he authorizes to PATCH project `wnerhajyjjmrtsdmdpzu` and nothing else).
4. **Deferred product work needs Guang's decision before any plan/execute:** phase 1 (consent-gated onboarding analytics), phase 4 (server-side marketing opt-in), teaser **migration 045**, 7-day trial A/B (post-launch only).
5. **Merge strategy to `main` is Guang's call.** Do not merge this branch, PR #7, or PR #8 onto `main` unless he says so. Do not open a landing PR unless he asks.
6. **Go-live (Guang only):** migration **044** and `NEXT_PUBLIC_PAYWALL_ENABLED=true` ship **together**. Then operator scripts with the service role. Never apply 044 or flip the flag from an agent session.

## 4. How to verify

```bash
npm ci
npm run lint                     # tsc --noEmit, must be clean
npm test                         # vitest run
node --check .claude/skills/verify-snap-it-free/scripts/drive.mjs

# Local (see verify-snap-it-free SKILL.md). Older no-data baseline 59/61 + 3 SKIP is pre-ob4; re-record after a local run.
node .claude/skills/verify-snap-it-free/scripts/drive.mjs onboarding --url http://127.0.0.1:PORT --out /tmp/ev-local

# Vercel Preview (payments on). Share token via env ONLY, never in a file or commit.
# After HEAD is actually deployed (not before — live alias may still be ef22e5f):
VERCEL_SHARE_TOKEN=<token from Guang> node .claude/skills/verify-snap-it-free/scripts/drive.mjs onboarding \
  --url https://zerodollar-git-preview-2efe87-chenguangregis-gmailcoms-projects.vercel.app --out /tmp/ev-preview
# Last recorded at ef22e5f: RESULT onboarding 69/69. Re-run after f8d5589 is live; check weekly average + spread map pins.
```

Then `/gsd-verify-work` for phases 2 and 3 so `UAT.md` exists. Preview is Vercel-auth protected; regenerate a share link with Vercel MCP `get_access_to_vercel_url` if the old one expired.

- Stub past the required account step only with `?onboarding=1` + localStorage `shoumanwu_onboarding_stub_auth=1` (Preview/local, never production).
- Phone viewports: iPhone 390×844 and Android 412×915, each in en, it, zh.
- Webhook-only path is **not** covered by drive.mjs; that is the Guang-gated 4242 test in §3.2.

## 5. Hard constraints

- Never push to `main`, force-push, merge, deploy to production, run remote migrations, change Vercel settings, or delete data without Guang's confirmation.
- **Do not merge PR #7, PR #8, or this branch to `main`** unless Guang decides the landing strategy.
- **No sign-ups on the Preview.** It shares the Supabase DB with production. Use the QA stub, or a throwaway account only after Guang's explicit OK.
- No fake reviews, counts, scarcity or discounts. Every number shown must come from real data or real prices.
- Never commit secrets or share tokens. Pass `VERCEL_SHARE_TOKEN` and any bypass secret via env only; never print them.
- Don't touch or test production (https://zerodollar-blond.vercel.app).
- Keep all new work on `preview/recent-changes` unless Guang names another branch.
- Remove `HANDOFF.md` in the last commit before a landing PR is marked ready.
- Don't write the EU 14-day withdrawal clause in the Terms (Guang's decision).
- Give Guang a direct clickable URL whenever asking him to sign in or open something.
- Do every step the session can do; hand off only what is impossible from here.

## 6. Open questions for Guang

1. **Was removing the "You're in" banner/toast in d79b531 Guang's intent?** The commit message says he found the banner annoying; confirm that still stands (phase 2 SUMMARY still describes the old toast).
2. **Confirm `preview/recent-changes` as the single working branch** (replacing `feat/onboarding-snag` as the place new work goes).
3. Analytics provider and cookie-consent approach for onboarding funnel events (deferred phase 1).
4. Approve a migration to store marketing opt-in server-side (deferred phase 4) and/or teaser migration 045? Applying either to the shared DB needs his explicit OK.
5. Allow one new throwaway test account on the shared DB for the **webhook-only** Stripe test-mode purchase (close tab after 4242)?
6. How should this stack land on `main`? Preview already contains #8 → #7 → onboarding-snag.
7. Legal review of the subscription Terms/Privacy copy is still pending (the 14-day clause stays unwritten).
8. `VERCEL_SHARE_TOKEN` for Preview `drive.mjs` (env only, never in the repo).
9. Production Supabase Magic Link / Confirm templates: is the OTP `{{ .Token }}` line live? (Affects production emails; additive only if missing.)
10. Revoke the leaked Playwright session refresh token (PR #6 follow-up); decide on history purge.
