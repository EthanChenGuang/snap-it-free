# HANDOFF: feat/onboarding-snag → Cursor snap-it-free

Handed over 2026-10-29 by CC snap-it-free (Claude Code on the box). **Cursor snap-it-free owns this branch.**

## 1. Context

- **Branch:** `feat/onboarding-snag`. It is based on `feat/stripe-subscriptions` @ `ecff082`, which is PR #8 (base `feat/onboarding-paywall`, PR #7, base `main`). There is no PR for this branch yet. **Do not open one unless Guang asks.**
- **Goal:** replace the bare 4-step intro with a 10-screen, Snag-modelled onboarding that drives sign-up and paid conversion, honestly. The flow is `hook → how → interests → mobility → city → preview → account → alerts → paywall → feed`.
- **Design docs (in the repo):**
  - `.planning/onboarding-snag/PROPOSAL.md`: flow, techniques (adopt/adapt/reject), en/it/zh copy, implementation map.
  - `.planning/onboarding-snag/SPEC.md`: public-source teardown of "Snag – Zero Dollar Items".
  - `.planning/quick/261028-ob2-onboarding-snag-redesign/{PLAN,SUMMARY}.md`: what was built for the 10-screen flow.
  - `.planning/phases/02-youre-in-after-purchase/` and `.planning/phases/03-locked-feed-search-filters/`: this run (items 2–3).
- **Key design decisions (from PROPOSAL):** unchanged. Real data only. Quiz answers used. Paywall ✕ from first frame, yearly preselected, "Unlock my feed", UCPD "free" note. zh: no spaces around the city name.
- **Guang's decisions:** account step sign-up REQUIRED; no free trial at launch; do **not** write the EU 14-day withdrawal clause; keep the QA account-skip stub in non-production only.
- **Infra:** unchanged. Preview `zerodollar` / team `chenguangregis-gmailcoms-projects`. Branch alias https://zerodollar-git-feat-on-4ecf97-chenguangregis-gmailcoms-projects.vercel.app. Preview and production share one Supabase DB. Production https://zerodollar-blond.vercel.app is untouched.

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
| feb3b96 | Handover to Cursor: this file, design docs into `.planning/onboarding-snag/`, STATE.md |
| (this commit) | **P10 items 2+3:** "You're in" after Checkout return; locked feed search/filters change real count + blurred photos; unit tests; drive.mjs coverage |

No DB migration on this branch.

**Verification evidence (2026-10-29, Cursor snap-it-free, items 2+3):**

- Took over at `feb3b96` (matches expected head; no extra commits beyond it).
- `npm run lint` (tsc --noEmit): clean.
- `npm test`: **Test Files 132 passed (132), Tests 824 passed (824)** (baseline was 130 / 800).
- **drive.mjs local** (Node 22, payments off, dummy public env so next can prerender, no real Supabase data):
  - `RESULT onboarding: 59/61 checks passed`
  - 2 FAIL (same as the old 50/52 baseline, no listing data):
    1. `preview shows a real count for Milan: "Your feed is ready"`
    2. `paywall headline carries the real count + city: "See every free item near you"`
  - 3 SKIP (never PASS):
    1. `locked-feed search count: no teaser data in this environment` (new; needs real rows)
    2. `locked-favorites: flag-off build does not preview-lock /favorites` (new; `/favorites` ignores `?onboarding=1` so it can stay static; persist/Preview cover flag-on)
    3. `locked-detail: no real listing id` (same as baseline)
  - New checks that passed: search enabled on locked feed; typing search does not open paywall; filter sheet opens without paywall; You're in on unlocked `/?checkout=success`; city/interests/radius applied (milano, libri-riviste, 5 km).
- **Viewport screenshots** (local): iPhone 390×844 and Android 412×915 × en/it/zh for locked feed (search header visible) and checkout success (You're in / Ci sei / 已开通). Saved under `/opt/cursor/artifacts/`.
- **Vercel Preview drive.mjs:** pending a `VERCEL_SHARE_TOKEN` (not in this environment). After push, confirm the newest commit's GitHub commit status is Ready.
- No sign-ups, no remote migrations, no Vercel settings changes, no production deploys.

## 3. What's next

Unbuilt or deferred from PROPOSAL/SPEC/PLAN. Each needs Guang's go-ahead where marked.

1. **Onboarding funnel analytics** (PROPOSAL §3/§5) is not built; no events exist.
   - Events: step_view, step_complete, skip, paywall_view, checkout_start and purchase.
   - The events must be consent-gated. Put them in a new `lib/analytics/onboarding.ts`.
   - The provider choice and the cookie-consent banner are a decision for Guang.
2. **"You're in" after purchase** (PROPOSAL P10) — **done this run.** Success toast/banner when the feed is unlocked; pending notice kept when still locked; city, interests and radius applied from onboarding prefs.
3. **Locked feed: search and filters stay usable** (PROPOSAL P10) — **done this run.** Header search/filters already existed; they now change the real count and blurred photos. Detail and favorites stay locked. Real data only.
4. **Marketing email opt-in is stored in localStorage only** (`shoumanwu_marketing_optin` in `AccountStep.tsx`).
   - It is not saved to the user's profile, so win-back email (PROPOSAL §3) is impossible.
   - Doing it needs a DB column and a migration. **Ask Guang; no remote migration without him.**
5. **Teaser migration 045** (category-filtered teaser count + a server-side "new in Veneto in the last 7 days" count) is deferred.
   - Today these numbers are derived client-side from already-fetched rows. After 044, locked search/filters cannot change the count without 045 (honest fallback: keep the SSR teaser).
   - Needs Guang's approval, and it must never be applied to the shared DB without him.
6. **Real end-to-end Stripe test purchase is unverified:** sign-in → Checkout → webhook → unlocked feed → Portal → cancel → locked. It needs a real test account, which is **not allowed on the shared Preview DB** without Guang's explicit OK.
7. **After launch, not now:** a 7-day free-trial A/B on yearly (Stripe `trial_period_days`, a reminder email, legal copy), and price A/B tests.
8. **Open environment items:**
   - The box `.env.local` lacks the real Supabase public vars, so local `drive.mjs onboarding` is 59/61 + 3 SKIP (see §2). Cursor cloud agents need their own env (ask Guang for the public URL/anon key as a cloud-agent secret).
   - After pushing, always confirm the Vercel Preview for the newest commit is **Ready** before testing it.
   - Preview `drive.mjs` needs `VERCEL_SHARE_TOKEN` via env (never in a file).
9. **Before the PR is ready:**
   - How the PR stack lands (rebase or retarget onto main) is Guang's decision.
   - Remove HANDOFF.md in the last commit.
   - Go-live order (from feat/stripe-subscriptions): 044 + `NEXT_PUBLIC_PAYWALL_ENABLED=true` in the same release, then operator scripts to the service role. **Guang only.**

## 4. How to work

- Use GSD **`/gsd-autonomous`** for remaining phases. Items 1 and 4 of §3 still need Guang; 5–7 need his answer first.
- Use **`/clear` at every natural checkpoint**.
- **Any UI design work must use the stitch design skills.** Stick to the stitch tokens in `DESIGN.md`: black primary CTA, `outline-variant` borders, Inter, Material Symbols; no red theme and no shadows; photos `rounded-2xl`; existing 240 ms motion, reduced-motion respected. There is no `STITCH_API_KEY`; do not call the Google Stitch API.
- **Verification is mandatory before calling anything done.** Use `.claude/skills/verify-snap-it-free/` (`SKILL.md`, `scripts/drive.mjs`, `features/`), then lint and the unit tests.
- Keep GSD artifacts in `.planning/` (gitignored, commit with `git add -f`) and update `.planning/STATE.md`.

## 5. How to verify

```bash
npm ci
npm run lint                     # tsc --noEmit, must be clean
npm test                         # vitest run; now 132 files / 824 tests
node --check .claude/skills/verify-snap-it-free/scripts/drive.mjs

# Local (build/start per .claude/skills/verify-snap-it-free/SKILL.md, Node 22, payments off):
node .claude/skills/verify-snap-it-free/scripts/drive.mjs onboarding --url http://127.0.0.1:PORT --out /tmp/ev-local
# Known local baseline without real Supabase data: 59/61 + 3 SKIP (2 FAIL = Milan count + paywall headline).

# Vercel Preview (payments on). Share token via env ONLY, never in a file or commit:
VERCEL_SHARE_TOKEN=<token from Guang> node .claude/skills/verify-snap-it-free/scripts/drive.mjs onboarding \
  --url https://zerodollar-git-feat-on-4ecf97-chenguangregis-gmailcoms-projects.vercel.app --out /tmp/ev-preview
# Expect: "RESULT onboarding: …" with the new P10 checks; previously 53/53 before this run.
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
7. `VERCEL_SHARE_TOKEN` for the Preview drive.mjs run of this commit (env only, never in the repo).
