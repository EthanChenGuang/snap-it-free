# HANDOFF: feat/onboarding-snag → Cursor snap-it-free

Handed over 2026-10-29 by CC snap-it-free (Claude Code on the box), because Guang's Claude quota is used up. From now on **Cursor snap-it-free owns this branch**; CC will not push to it unless Guang hands it back.

## 1. Context

- **Branch:** `feat/onboarding-snag`. It is based on `feat/stripe-subscriptions` @ `ecff082`, which is PR #8 (base `feat/onboarding-paywall`, PR #7, base `main`). There is no PR for this branch yet.
- **Goal:** replace the bare 4-step intro with a 10-screen, Snag-modelled onboarding that drives sign-up and paid conversion, honestly. The flow is `hook → how → interests → mobility → city → preview → account → alerts → paywall → feed`.
- **Design docs (in the repo):**
  - `.planning/onboarding-snag/PROPOSAL.md`: flow, techniques (adopt/adapt/reject), en/it/zh copy, implementation map.
  - `.planning/onboarding-snag/SPEC.md`: public-source teardown of "Snag – Zero Dollar Items".
  - `.planning/quick/261028-ob2-onboarding-snag-redesign/{PLAN,SUMMARY}.md`: what was built.
- **Key design decisions (from PROPOSAL):**
  - Real data only: real counts from the DB/teaser, real listing photos, blurred on the locked screens. Low supply is shown honestly.
  - The quiz answers are used. Interests set the feed categories, mobility sets the default radius (1/5/15 km), and city sets the city filter. One alert is created after push is enabled.
  - "Building your feed" runs only while the real request is in flight. There is no fake delay.
  - Paywall:
    - The ✕ close is visible from the first frame.
    - Yearly is preselected, but all 3 plans are visible.
    - "Save N%" is computed from the real prices and floored (66%). The per-week price sits next to an equally visible billed total.
    - The CTA reads "Unlock my feed".
    - The note "the items are free; the subscription pays for finding them" defuses the UCPD "free" risk.
  - Rejected: unverifiable volume claims, testimonials, ratings and "Top 10" badges, a rating prompt, mock local items, low-contrast Skip, countdowns and false savings.
  - The zh strings put no spaces around the city: `解锁{city}的 {n} 件免费物品`. This supersedes the copy table in PROPOSAL §4.
- **Guang's decisions:**
  - The account step is **sign-up REQUIRED**. There is no "Not now".
  - **No free trial at launch.** A 7-day trial A/B test comes later, after launch.
  - **Do NOT write the EU 14-day withdrawal clause in the Terms.** Leave the Terms as they are.
  - **Keep the QA account-skip stub** (`?onboarding=1` + localStorage `shoumanwu_onboarding_stub_auth=1`), but only in non-production builds. That is done in bb6c836.
- **Infra:**
  - **Vercel:** project `zerodollar`, team `chenguangregis-gmailcoms-projects`.
    - The branch alias is https://zerodollar-git-feat-on-4ecf97-chenguangregis-gmailcoms-projects.vercel.app.
    - Vercel Authentication is on, so a phone needs a share link. Guang has one; it is never stored in the repo.
    - The Preview has Stripe **test** mode and `NEXT_PUBLIC_PAYWALL_ENABLED=true`.
  - **Supabase:** the Preview and production share one Supabase DB (SnapItFree).
    - Migrations 042 and 043 are applied remotely. 044 (the listings RLS paywall gate) is **not** applied; it is for go-live only.
    - The app falls back to a row-based teaser before 044, so the teaser RPC 404 on the Preview is expected.
  - **Production** is https://zerodollar-blond.vercel.app. It is untouched; do not test against it.

## 2. Done so far (ecff082..HEAD)

| Commit | What |
| --- | --- |
| 1c24140 | Onboarding state machine (10 screens + sessionStorage resume), interests→categories mapping, `savingsVsMonthlyPct()`, Venice/Padova-first onboarding city order |
| b73e638 | Onboarding UI rebuilt (per-step components: PhotoCollage, MiniFeedCard, BuildingFeed, AccountStep, AlertsMock) + personalized honest paywall, en/it/zh |
| 222b11f | WIP: drive.mjs journey for the new onboarding, handoff |
| 730b6d9 | Handoff: first Preview walk results |
| f781014 | Paywall fits all 3 plan cards + "Save 66%" without scrolling on 390x844/412x915; CTA "Unlock my feed"/"Sblocca il mio feed"/"解锁我的推荐"; Italian badge inline |
| a076632 | tsc fix in `lib/favorites/store.test.ts` (vi.fn mock), test only |
| 83ecf73 | drive.mjs: CTA label + no-scroll assertions, optional `VERCEL_SHARE_TOKEN`, screen 10 check |
| 2bb4c3a | GSD summary of the Preview follow-up fixes |
| 024138e | Handoff update |
| 63f4a2f | zh strings: no spaces around the city name (paywall title, preview result/low supply, alerts mock); `messages/zh.test.ts` |
| bb6c836 | `isAccountSkipStubAllowed()` in `lib/paywall/gate.ts` + `next.config.ts` bakes `VERCEL_ENV` into `NEXT_PUBLIC_VERCEL_ENV`; the stub is OFF in production builds; unit tests |
| fcd0d7b | drive.mjs environment-aware: CTA retry checks payments off ("Payments aren't enabled yet") vs on (guest sign-in, checkout 401); locked-detail falls back to a teaser listing id, SKIP never PASS |
| b0c5f94 | GSD summary + handoff for the 261029 follow-up |
| 5a9618e | Handoff: 261029 follow-up verified on the Preview |
| (this commit) | Handover to Cursor: this file, design docs into `.planning/onboarding-snag/`, STATE.md |

No DB migration on this branch.

**Verification evidence (2026-10-29, at b0c5f94):**
- `npm run lint` (tsc --noEmit): clean.
- `npm test`: **Test Files 130 passed (130), Tests 800 passed (800)**.
- **drive.mjs on the Preview:** `onboarding: 53/53 checks passed`, with 0 FAIL and 0 SKIP.
  - Payments-on branch: a guest tapping the CTA gets the sign-in prompt (checkout 401), no charge.
  - Locked detail: `/listing/<id>` shows the lock for a non-subscriber.
- **6-run Playwright walk on the Preview** (iPhone 390x844 and Android 412x915, en/it/zh):
  - All 6 runs reach hook>…>paywall>locked feed with **0 page errors**.
  - The yearly card bottom is at 551–595px and the CTA top at 711–797px, so no scroll is needed.
  - The CTA labels are correct, and the zh headline renders `解锁威尼斯的 355 件免费物品`.
  - The stub still works on the Preview.
- The Vercel status for 5a9618e is success (GitHub commit status).

## 3. What's next

Unbuilt or deferred from PROPOSAL/SPEC/PLAN. Each needs Guang's go-ahead where marked.

1. **Onboarding funnel analytics** (PROPOSAL §3/§5) is not built; no events exist.
   - Events: step_view, step_complete, skip, paywall_view, checkout_start and purchase.
   - The events must be consent-gated. Put them in a new `lib/analytics/onboarding.ts`.
   - The provider choice and the cookie-consent banner are a decision for Guang.
2. **"You're in" after purchase** (PROPOSAL P10) is not built: no success toast after Stripe Checkout returns.
   - Only the existing "activation can take a minute" notice exists.
   - Check that the city, interests and radius are applied when the feed opens unlocked.
3. **Locked feed: search and filters stay usable** (PROPOSAL P10, "soften paywall on every tap"). Check the current behaviour on the Preview. Lock only the detail and favorites, and let search/filters change the count and the blurred photos.
4. **Marketing email opt-in is stored in localStorage only** (`shoumanwu_marketing_optin` in `AccountStep.tsx`).
   - It is not saved to the user's profile, so win-back email (PROPOSAL §3) is impossible.
   - Doing it needs a DB column and a migration. **Ask Guang; no remote migration without him.**
5. **Teaser migration 045** (category-filtered teaser count + a server-side "new in Veneto in the last 7 days" count) is deferred.
   - Today these numbers are derived client-side from already-fetched rows.
   - Needs Guang's approval, and it must never be applied to the shared DB without him.
6. **Real end-to-end Stripe test purchase is unverified:** sign-in → Checkout → webhook → unlocked feed → Portal → cancel → locked. It needs a real test account, which is **not allowed on the shared Preview DB** without Guang's explicit OK.
7. **After launch, not now:** a 7-day free-trial A/B on yearly (Stripe `trial_period_days`, a reminder email, legal copy), and price A/B tests.
8. **Open environment items:**
   - The box `.env.local` lacks the Supabase public vars, so the local `drive.mjs onboarding` run scores 50/52 + 1 SKIP. The failures are the Milan count, the count+city headline, and the locked-detail SKIP, all because the local build has no data. Cursor cloud agents need their own env (ask Guang for the public URL/anon key as a cloud-agent secret).
   - After pushing, always confirm the Vercel Preview for the newest commit is **Ready** before testing it.
9. **Before the PR is ready:**
   - How the PR stack lands (rebase or retarget onto main) is Guang's decision.
   - Remove HANDOFF.md in the last commit.
   - Go-live order (from feat/stripe-subscriptions): 044 + `NEXT_PUBLIC_PAYWALL_ENABLED=true` in the same release, then operator scripts to the service role. **Guang only.**

## 4. How to work

- Use GSD **`/gsd-autonomous`** for the remaining phases. Turn items 1–4 of §3 into phases; items 5–7 need Guang's answer first.
- Use **`/clear` at every natural checkpoint**: between phases, between tasks, after a verification run, before starting a new sub-task.
- **Any UI design work must use the stitch design skills.** This is mandatory. Stick to the stitch tokens in `DESIGN.md`:
  - black primary CTA, `outline-variant` borders, Inter, Material Symbols;
  - no red theme and no shadows;
  - photos `rounded-2xl`;
  - the existing 240 ms motion, with reduced motion respected.
- **Verification is mandatory before calling anything done.** Use the repo's verify skill `.claude/skills/verify-snap-it-free/` (`SKILL.md`, `scripts/drive.mjs`, `features/`), then lint and the unit tests. Every claim in a summary needs a command output behind it.
- Keep GSD artifacts in `.planning/` (it is gitignored, so commit with `git add -f`) and update `.planning/STATE.md`.

## 5. How to verify

```bash
npm ci
npm run lint                     # tsc --noEmit, must be clean
npm test                         # vitest run; baseline 130 files / 800 tests
node --check .claude/skills/verify-snap-it-free/scripts/drive.mjs

# Local (build/start per .claude/skills/verify-snap-it-free/SKILL.md, Node 22, payments off):
node .claude/skills/verify-snap-it-free/scripts/drive.mjs onboarding --url http://127.0.0.1:PORT --out /tmp/ev-local

# Vercel Preview (payments on). Share token via env ONLY, never in a file or commit:
VERCEL_SHARE_TOKEN=<token from Guang> node .claude/skills/verify-snap-it-free/scripts/drive.mjs onboarding \
  --url https://zerodollar-git-feat-on-4ecf97-chenguangregis-gmailcoms-projects.vercel.app --out /tmp/ev-preview
# Expect: "RESULT onboarding: 53/53 checks passed".
```

- To walk past the required account step without a real account, use `?onboarding=1` + localStorage `shoumanwu_onboarding_stub_auth=1`. This works on Preview/local only, never in production.
- Phone viewports to check: iPhone 390x844 and Android 412x915, each in en, it and zh.

## 6. Hard constraints

- Never push to `main`, force-push, merge, deploy to production, run remote migrations, change Vercel settings, or delete data without Guang's confirmation.
- **Never merge PR #7 or PR #8.**
- **No sign-ups on the Preview.** It shares the Supabase DB with production. Use the QA stub instead.
- No fake reviews, counts, scarcity or discounts. Every number shown must come from real data or real prices.
- Never commit secrets or share tokens. Pass `VERCEL_SHARE_TOKEN` via env only.
- Don't touch or test production (https://zerodollar-blond.vercel.app).
- Keep all work on `feat/onboarding-snag`.
- Remove HANDOFF.md in the last commit before the PR is marked ready.
- Don't write the EU 14-day withdrawal clause in the Terms (Guang's decision).

## 7. Open questions for Guang

1. Analytics provider and the cookie-consent approach for the onboarding funnel events (§3.1).
2. Approve a migration to store the marketing opt-in server-side (§3.4), and/or teaser migration 045 (§3.5)? Applying either to the shared DB needs his explicit OK.
3. Allow one throwaway test account on the shared DB for a real Stripe test-mode purchase end to end (§3.6)?
4. How should the PR stack land? This branch sits on #8 → #7 → main, and #7/#8 must not be merged without him.
5. Legal review of the subscription Terms/Privacy copy is still pending (the 14-day clause stays unwritten by his decision).
6. Supabase public URL/anon key for Cursor cloud agents' env, so local drive.mjs can pass fully.
