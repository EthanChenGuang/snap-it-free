# Quick 261028-ob2 — SUMMARY (follow-up fixes from the Preview walk)

Branch `feat/onboarding-snag`. These address the "Found on the Preview, still to fix" items
from HANDOFF.md after the 2026-10-29 preview walk (PROMPT2).

## Fixes applied (2026-10-29)

1. **Paywall first-view clipping (P-new).** The preselected Yearly card (Best value, per-week,
   "Save 66%") was half-hidden behind the sticky CTA on both 390×844 and 412×915. Tightened the
   content column in `components/onboarding/PaywallScreen.tsx` so all three plan cards + the savings
   tag fit without scrolling in en/it/zh:
   - headline `28px/1.2` → `26px/1.15`; content bottom pad `md` → `sm`.
   - photo strip cells `aspect-[4/5]` → `aspect-[16/10]`, `rounded-2xl` → `rounded-xl`, top margin `md` → `sm`.
   - benefits list `mt-lg space-y-sm` → `mt-md space-y-1.5`, `leading-snug`, icon `20px` → `18px`.
   - proof line `mt-md` → `mt-sm`, `text-label-md` → `text-label-sm`.
   - plans container `mt-lg` → `mt-md`; cards drop the `min-h-16` floor.
   - free-note `mt-md` → `mt-sm`.
   The close ✕, price + auto-renew line and Terms/Privacy stay anchored near the CTA (footer unchanged).

2. **Paywall CTA label.** `cta` now reads **"Unlock my feed" / "Sblocca il mio feed" / "解锁我的推荐"**
   (was "Continue / Continua / 继续") in `messages/{en,it,zh}.ts`. Asserted by a new
   `PaywallScreen.test.tsx` case and by `drive.mjs` (en + zh).

3. **Italian "Più conveniente" badge (P2-3).** The badge row is no longer `flex-wrap`, so the badge
   sits inline/compact next to "Annuale" and never adds a line that grows the card. To give it room,
   the per-week equivalent and the savings tag were made compact:
   - `savingsVsMonthly`: `Save {pct}%` / `Risparmi il {pct}%` / `比月付省 {pct}%` (dropped the long
     "vs monthly" / "rispetto al mensile" tail so the right column stays narrow).
   - `perWeek`: `… / wk` / `… / sett.` / `… / 周`.
   - IT `benefitAlerts` shortened to "Avvisi per le tue parole chiave" (was a 2-line wrap).
   Checked against en and zh too (both already short).

4. **tsc error.** `lib/favorites/store.test.ts:56` mock assignment wrapped in `vi.fn(...)` so the
   RHS matches the mocked `createClient` signature. Test-only. `tsc --noEmit` is now clean.

5. **Verification harness.**
   - `drive.mjs` gained optional `VERCEL_SHARE_TOKEN` (env only): each fresh context first visits
     `${url}/?_vercel_share=<token>` to plant the protection-bypass cookie. Never hardcoded/committed.
   - New assertions: CTA reads "Unlock my feed" (en) / "解锁我的推荐" (zh); all three plan cards +
     the yearly savings tag fit without scrolling; screen 10 (post-paywall locked feed) carries the
     user's persisted city + interest choices.
   - `node --check drive.mjs` passes. The browser walk itself runs against the Vercel Preview
     (the box `.env.local` lacks the Supabase public vars, so the local `next build` prerender fails;
     compile + tsc + unit tests pass locally).

## Verification (local)

- `npm run lint` (`tsc --noEmit`): clean.
- `npm test` (`vitest run`): 129 files / 793 tests pass (+3 CTA-label cases).
- `node --check .claude/skills/verify-snap-it-free/scripts/drive.mjs`: OK.

## Unchanged (per constraints)

- EU 14-day legal copy, Stripe/paywall/data-gate logic, DB migrations.

## Follow-up 261029 (PROMPT3 — Guang-approved 3 changes, IMPLEMENT only; not yet browser-verified)

1. **zh paywall headline spacing.** `messages/zh.ts` `paywall.titlePersonalized` now renders
   `解锁威尼斯的 355 件免费物品` (no spaces hugging the Chinese city name; a space still brackets the
   Latin numeral per normal Chinese typography). Same fix applied to every other zh string that
   interpolated the city the same way: `onboarding.preview.result`, `onboarding.preview.lowSupply`,
   `onboarding.alerts.mockLine2`. `en`/`it` untouched. New `messages/zh.test.ts` asserts the exact
   strings (4 tests).
2. **QA account-skip stub gated to non-production builds.** New pure fn
   `isAccountSkipStubAllowed(vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV)` in `lib/paywall/gate.ts`
   returns `false` only when the env is `'production'` (ON for `preview`/`development`/undefined-local).
   `next.config.ts` bakes `VERCEL_ENV` into `NEXT_PUBLIC_VERCEL_ENV` as a build-time literal (no Vercel
   settings changed). `AccountStep.readStubSignedIn()` now returns `false` in a production build before
   it even looks at the `?onboarding=1` param / localStorage flag, so production has no way to skip
   sign-up. `lib/paywall/gate.test.ts` adds 3 tests proving OFF for `production`, ON otherwise.
3. **drive.mjs made environment-aware (no weakened checks).**
   - CTA retry: reads `GET /api/subscription` `configured`. Payments off → asserts
     "Payments aren't enabled yet" (`paywall-comingSoon`); payments on + guest → asserts the
     "Sign in to subscribe" notice (`paywall-signInRequired`, checkout → 401, no charge). Both notices
     share the Continue button, so the walk proceeds either way.
   - Locked-detail probe: prefers a `/listing/` link from `/`; when the paywalled feed has none
     (Preview), falls back to a real listing id captured from the onboarding teaser's
     `listings_public` Supabase response; emits an explicit `SKIP` line (never PASS) only if no id is
     found. Never signs up on the Preview. `VERCEL_SHARE_TOKEN` stays env-only.
   - `node --check` passes.

### Follow-up verification (local)

- `npm run lint` (`tsc --noEmit`): clean.
- `npm test` (`vitest run`): **130 files / 800 tests** pass (+4 zh spacing, +3 stub-gate).
- `node --check .claude/skills/verify-snap-it-free/scripts/drive.mjs`: OK.
- Browser walk against local + the Preview is deferred to a separate fresh run.
</content>
</invoke>
