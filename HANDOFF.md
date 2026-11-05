# HANDOFF: `preview/recent-changes` (refreshed 2026-11-04)

Canonical with `.planning/STATE.md` and `.planning/ROADMAP.md`. `.planning/.continue-here.md` is the resume checkpoint; if it disagrees, trust this file and STATE.

## 1. Context

- **Working branch:** `preview/recent-changes` — **the only working branch** (Guang, 2026-11-04). Do not create or push other branches, even if a session is assigned one.
- **History already in this branch:** `feat/onboarding-snag`, PR #7 (`feat/onboarding-paywall`), PR #8 (`feat/stripe-subscriptions`). They are merged here; they are **not** landed on `main`. How (or whether) this stack reaches `main` is Guang's call.
- **Latest code:** quick 261104-ob5 (`87ac2ca` + label fix), Claude Code 2026-11-04.
- **Live Preview = branch head** (auto-deployed on push). Any push to this branch deploys a Preview — mind the Hobby cap of 100/day.
- **Goal:** Snag-modelled onboarding that drives sign-up and paid conversion, honestly. Flow now includes weekly / map / favorites (quick 261031-ob4) plus the earlier 10-screen spine.
- **Design docs:** `.planning/onboarding-snag/{PROPOSAL,SPEC}.md`; `.planning/quick/261028-ob2-*`, `261030-ob3-*`, `261031-ob4-*`; `.planning/phases/02-youre-in-after-purchase/` and `03-locked-feed-search-filters/` (PLAN + SUMMARY only; **no UAT/VERIFICATION**).
- **Stitch:** project `9058658661756179433` was used (Lagoon Pop + Snag gap screens). Stitch design work is in-scope; do not claim there is no Stitch project or that Stitch must not be called.
- **Guang's decisions still in force:** account-step sign-up **required**; no free trial at launch; do **not** write the EU 14-day withdrawal clause; QA account-skip stub in non-production only.
- **Infra:** Preview project `zerodollar` / team `chenguangregis-gmailcoms-projects` (`prj_I7t3oeWwE9F8EJT1q04RGWUBUfI8`, team `team_tHRDIP8AtALXIH4nKvMjUBwg`). Branch alias: https://zerodollar-git-preview-2efe87-chenguangregis-gmailcoms-projects.vercel.app — add `?onboarding=1` to force onboarding. Preview and production share one Supabase DB (`wnerhajyjjmrtsdmdpzu`). Production https://zerodollar-blond.vercel.app is untouched.

## 2. Done

On `preview/recent-changes` (on top of `main` @ 2373352), including history from PRs #7/#8 and `feat/onboarding-snag`:

- Flagged onboarding + hard paywall, Stripe test-mode Checkout/Portal/webhook, subscriptions table, 3-day `past_due` grace, migration **044** (not applied to the shared DB without Guang), subscription Terms/Privacy (flag-on builds).
- Snag-modelled onboarding UI (ob2), Lagoon Pop redesign from Stitch (ob3), Snag weekly/map/favorites + listing sources hidden (ob4, **ef22e5f**, on Preview).
- **f8d5589** weekly **per-day average** / busiest-day highlight (live). Its pin spread was replaced by ob5.
- **Quick 261104-ob5:** onboarding map is **city-level** (one bubble per city, real active counts; only Subito is enabled and it has no per-item coordinates). Copy no longer claims per-item pins or distance on every card. On non-production builds a **non-subscriber sees onboarding on every visit** (production keeps once per browser).
- Inline paywall sign-in (Google + email code), "already subscribed" loop fix, switch-account ("Not you?"), fast first feed load + searching state (ca0464d).
- Stripe webhook endpoint retargeted from the old `feat/stripe-subscriptions` alias to this Preview alias (automation bypass already on). **One successful test-mode delivery** 2026-10-31. Signing secret unchanged; no webhook redeploy needed for the URL retarget.
- Guang made **one real annual Stripe test purchase** on 2026-10-31. Unlock went through the **return page and the webhooks**. The **webhook-only** path (pay, close tab, never hit `success_url`) is still unverified.
- **d79b531** dropped the post-checkout "You're in" banner and toast; `?checkout=` is still stripped. **Guang's intent** (confirmed 2026-11-04).
- Repo email templates with sign-in code (`c6b410b`, `supabase/templates/*`) for local/preview-branch config. **Production dashboard OTP line status unknown.**
- Phases **2** and **3** complete and verified (`UAT.md`). Last Preview `drive.mjs` (2026-11-04, ob5): onboarding **70/70**, persist **9/9**.

No remote migration, no production deploy, no `main` push from this work.

## 3. Next (ordered)

1. ~~Redeploy + verify phases 2–3~~ **Done 2026-11-04** (`UAT.md`). ~~Map screen~~ **Done 2026-11-04** (ob5, city-level; Guang's choice).
2. **Webhook-only unlock — evidence 2026-11-04 (no new account needed):** (a) `verify-subscription-sync` 5/5 at HEAD (sync files unchanged since 8dfc2dc); its scenarios include "return route never runs", i.e. the webhook alone converges. (b) Stripe test mode: endpoint `we_1UUZhq…` → Preview alias, enabled, 4 event types; every recent event has `pending_webhooks: 0` (delivered 2xx), incl. the 10-31 purchase (`customer.subscription.created`, `checkout.session.completed`) and a webhook-only renewal `customer.subscription.updated` on 11-02. Remaining gap: no live first purchase with the return page skipped. Optional; only with a throwaway account and Guang's OK.
3. **Supabase email OTP — pre-launch item.** Checked 2026-11-04 by Guang: the production Magic Link body has **only the link, no code**, and Supabase no longer lets the body be edited on the built-in mailer (custom SMTP required). The app's email sign-in copy now says "tap the link; enter a code if the email shows one" (en/it/zh), so nothing promises a code. Before launch, decide: set up custom SMTP (e.g. Resend) and add `<p>Or enter this code in the app: <strong>{{ .Token }}</strong></p>` to Magic Link + Confirm signup, or keep link-only. Do **not** click "Set up SMTP" without that decision (it changes how all production emails are sent).
3b. ~~Snag gap screen "why you can trust it"~~ **Done 2026-11-05** (quick 261105-ob6, Stitch screen `857017fd…`). Every Snag onboarding screen now has a counterpart; the testimonial wall and pre-use rating prompt stay out on purpose. Stitch works in cloud sessions via env `STITCH_API_KEY` → `https://stitch.googleapis.com/mcp` with header `X-Goog-Api-Key`.
4. **Deferred until after launch (recommendation accepted 2026-11-05):** phase 1 (consent-gated onboarding analytics), phase 4 (server-side marketing opt-in), teaser **migration 045**, 7-day trial A/B (post-launch only).
5. **Landing PR #10** (draft, `preview/recent-changes` → `main`, opened 2026-11-05 on Guang's go-ahead to follow the recommendation). Its body is the launch checklist. Stays draft; **do not merge or mark ready** until the checklist is done and Guang says go. Merging deploys production.
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
# Cloud sessions: also set PLAYWRIGHT_CORE=/opt/node-tools/node_modules/playwright
VERCEL_SHARE_TOKEN=<token from Guang> node .claude/skills/verify-snap-it-free/scripts/drive.mjs onboarding \
  --url https://zerodollar-git-preview-2efe87-chenguangregis-gmailcoms-projects.vercel.app --out /tmp/ev-preview
# Last recorded 2026-11-04 (ob5): onboarding 70/70, persist 9/9.
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

1. ~~Banner removal intent~~ — yes (2026-11-04).
2. ~~Single working branch~~ — yes, `preview/recent-changes` only (2026-11-04).
3. Analytics provider and cookie-consent approach for onboarding funnel events (deferred phase 1).
4. Approve a migration to store marketing opt-in server-side (deferred phase 4) and/or teaser migration 045? Applying either to the shared DB needs his explicit OK.
5. Webhook-only test: Guang asked for a recommendation (2026-11-04) — he runs it himself with a +alias account; see §3.2. Awaiting his go.
6. How should this stack land on `main`? Preview already contains #8 → #7 → onboarding-snag.
7. Legal review of the subscription Terms/Privacy copy is still pending (the 14-day clause stays unwritten).
8. `VERCEL_SHARE_TOKEN` for Preview `drive.mjs` (env only, never in the repo).
9. ~~OTP line in production templates~~ — authorized 2026-11-04; needs a Supabase access token in the session (§3.3).
10. Revoke the leaked Playwright session refresh token (PR #6 follow-up); decide on history purge.
