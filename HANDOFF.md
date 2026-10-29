# HANDOFF: feat/onboarding-snag (GSD quick 261028-ob2), stacked on feat/stripe-subscriptions

## Update 2026-10-29 06:20 Rome (CC snap-it-free, claude-ethan)

- **Fixed (f781014, a076632, 83ecf73, 2bb4c3a):** paywall fits all 3 plan cards + "Save 66%" above the fixed CTA on 390x844 and 412x915 (en/it/zh); CTA "Unlock my feed" / "Sblocca il mio feed" / "解锁我的推荐"; Italian "Più conveniente" badge inline; tsc error in `lib/favorites/store.test.ts` fixed (test only); drive.mjs takes an optional `VERCEL_SHARE_TOKEN` env var (never committed) and now checks screen 10.
- **Verified:** `npm run lint` pass; `npm test` 129 files / 793 tests pass. `drive.mjs onboarding` against the Preview (en): 51/53 pass. The 2 fails are environment, not product: (1) the unstubbed CTA retry expects "Payments aren't enabled yet" (local flag-off Stripe), but the Preview has Stripe test mode on, so a guest gets the sign-in path instead; (2) the locked-detail probe needs a listing link from `/`, which the Preview's paywalled feed does not render. 6-run Playwright walk (iPhone/Android x en/it/zh) on the Preview: all reach hook>...>paywall>feed, no page errors; yearly card bottom 555-595px vs CTA top 711-797px; screen 10 is the locked feed with the chosen city + category chips applied.
- **Still open:** make drive.mjs's two Preview-only checks environment-aware; zh paywall headline has spaces around the city ("解锁 威尼斯 的 355 件免费物品"); `?onboarding=1` stub-auth skip and EU 14-day withdrawal copy are for Guang.

## WIP 2026-10-28 23:55 Rome (CC snap-it-free, claude-ethan hit its session limit, resets 04:10 Rome)

- **Done:** 10-screen Snag-modelled onboarding per the research PROPOSAL (hook with real counts/photos, how it works, category quiz, travel-mode quiz -> default radius, city, feed-ready blurred real photos, account REQUIRED (no skip), alerts, paywall with close X visible from start, yearly preselected, "Save N% vs monthly" computed (floored) from real prices, NO free trial, then feed with choices applied). City list now puts Venice and Padova first (P1-2). Paywall/locked layout and Italian badge wrap (P1-3, P2-3) addressed in code; en/it/zh strings. Gate key bumped so existing users see the new flow once. Details: `.planning/quick/261028-ob2-onboarding-snag-redesign/`.
- **Verified so far:** `npx vitest run` 129 files / 790 tests pass. `npx tsc --noEmit`: 1 error, pre-existing and in an untouched file (`lib/favorites/store.test.ts:56`, mock type), not from this branch.
- **Not done yet:** `next build` (first attempt was killed, likely memory/timeout on the box), the verify-snap-it-free drive run on 390x844 and 412x915 in en/it/zh, phone screenshots of each step, the last WIP commit (drive.mjs journey update + small OnboardingFlow tweak) is unverified in a browser.
- **Preview walk 2026-10-29 00:05 Rome (deployment from 222b11f, Ready):** branch alias https://zerodollar-git-feat-on-4ecf97-chenguangregis-gmailcoms-projects.vercel.app (share link given to Guang in chat, not stored here). Playwright walk with QA stub auth (no real sign-up), iPhone 390x844 and Android 412x915, en/it/zh: all 6 runs reach hook>how>interests>mobility>city>preview>account>alerts>paywall, no page errors, paywall close X visible on load. City list starts Venice, Padova. Real count shown (e.g. "355 free items in Venice", "1,455 free items active in Veneto").
- **Found on the Preview, still to fix:** (a) the preselected Yearly card (with Best value and the per-week price) is half hidden behind the sticky CTA on first view on both phones, so the "Save 66%" tag is not visible without scrolling; (b) paywall CTA reads "Continue", PROPOSAL says "Unlock my feed"; (c) the Italian badge no longer wraps but stacks under "Annuale"; check it looks intended. Local `next build` fails only at prerender because the box `.env.local` lacks the Supabase public vars (compile + TypeScript pass); Vercel build passes.
- **Next:** build with Node 22 in the background (`NODE_OPTIONS=--max-old-space-size=4096`), run `.claude/skills/verify-snap-it-free` drive for the onboarding journey on both viewports and all locales, stub auth locally (never sign up against the shared DB), capture screenshots, push, wait for the Vercel Preview, share link.
- **Open questions for Guang:** EU 14-day withdrawal right copy in Terms (legal review). No new DB migration on this branch.

# HANDOFF: feat/stripe-subscriptions (GSD quick 261025-vwf, 261025-wba, then 261026-3w6)

Stripe **test-mode** subscriptions behind the hard paywall, plus the data-layer gate. This branch is stacked on `feat/onboarding-paywall` (PR #7, quick task 261025-s0z).

## Status check 2026-10-28 (CC snap-it-free, no code change)

- **Preview for phone testing:** https://zerodollar-git-feat-st-7ad3c2-chenguangregis-gmailcoms-projects.vercel.app (Vercel project `zerodollar`, team chenguangregis-gmailcoms-projects). Built from 69a8868 after every Preview env var was set. Vercel Authentication (SSO, `all_except_custom_domains`) is on, so a phone must be signed in to the chenguangregis-2098 Vercel account, or use a share link.
- **Preview env (names only):** STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_WEEKLY/MONTHLY/YEARLY, NEXT_PUBLIC_PAYWALL_ENABLED=true, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_PASSWORD. Smoke: `/` 200, `/api/subscription` 200 `configured:true`, `POST /api/stripe/checkout` 401 `sign_in_required` (not 503, so Stripe is enabled).
- **Remote DB (SnapItFree, wnerhajyjjmrtsdmdpzu):** 042 and **043 are applied** (`subscriptions.past_due_since` exists, `apply_subscription_state` uses it). 044 is **not** applied. These were applied by SQL, not through `supabase_migrations.schema_migrations` (history stops at 20260809140322). The go-live step "apply 043" below is therefore already done.
- The SnapItFree project is under the Supabase CLI profile `~/.supabase-profiles/acct2.yaml`, not the default login.

## Latest: 261026-3w6 (2026-10-26). Stripe route errors, signed-in locked card

- **Checkout and portal no longer throw an empty 500.**
  - A Stripe SDK error (e.g. "No such price") answers 502 `{"error":"stripe_error"}`. Anything else answers 500 `{"error":"internal_error"}`.
  - The server log gets one line, `[stripe] checkout failed { type, code, message }`, with keys redacted. Search Vercel logs for `[stripe]`.
  - 503/401/400/404/409 are unchanged. The checkout return route now also redirects to `?checkout=pending` when auth throws. The webhook was already structured and is untouched.
- **The paywall and Settings already showed** "Couldn't start checkout" and "Couldn't open the billing portal" (en/it/zh) on any failure, with a retry. Tests now prove it.
- **Signed-in users no longer see "Already subscribed? Sign in"** on the locked feed, detail or favorites. They see "Already subscribed? **Refresh status**", which re-checks `/api/subscription`: it reloads if active and otherwise says nothing is active yet. Guests are unchanged.
- Component tests now run in vitest (`components/**/*.test.tsx`, react-dom + jsdom, helper `components/test/render.tsx`).
- Verification:
  - `npm test` 128 files, 774 tests.
  - Builds with the flag off and on: 51/51 pages each.
  - drive: flag-off 4/4, onboarding 36/36 (adds a stubbed 502 plus retry), desktop-paywall 2/2, compare vs main 2/2 (identical DOM), persist 9/9.
- Known limit: "Refresh status" shows "no active subscription yet" also when `/api/subscription` itself is unreachable. The paywall's Restore button behaves the same way.
- Details: `.planning/quick/261026-3w6-stripe-route-errors-paywall-signed-in/`.

## Earlier: 261025-wba (2026-10-25/26). DB hard paywall, 3-day grace, subscription legal copy

Guang confirmed the open items in chat on 2026-10-25 23:14 Rome: "1–6 按推荐做, 同意7,8".

| # | Decision | Owner / status |
| --- | --- | --- |
| 1 | Stripe test prices (€1.99 / €4.99 / €19.99) | Other bot. Not touched here. |
| 2 | Vercel Preview env | Other bot. Not touched here. |
| 3 | Webhook endpoint + Customer Portal | Other bot. Not touched here. |
| 4 | Apply 042 to production | Operator. Applied as committed at bb5c090. 042 is frozen and unchanged. |
| 5 | Data-level RLS gate | Done here: `044_listings_paywall_rls.sql` (go-live only). |
| 6 | 3-day `past_due` grace | Done here: `043_subscriptions_past_due_since.sql` + app rule. |
| 7 | Legal copy | Done here: needs **Guang's legal review** before production. |
| 8 | Live keys need a dedicated code change | Recorded. No code change. `lib/stripe/config.ts` still refuses live keys. |

### Migrations (nothing applied remotely)

- **043_subscriptions_past_due_since.sql (additive, apply any time after 042).** It adds `subscriptions.past_due_since` and re-creates `apply_subscription_state` with the **same signature**, so the webhook code is identical before and after. The function stamps `past_due_since` from the event time on entering `past_due`, keeps it while the subscription stays `past_due`, and clears it on any other status. Before 043, the app reads subscriptions with `select('*')`, so nothing breaks; `past_due` simply gets no grace.
- **044_listings_paywall_rls.sql (GO-LIVE ONLY, together with `NEXT_PUBLIC_PAYWALL_ENABLED=true`).**
  - `has_active_subscription()` takes no argument and answers only for `auth.uid()`, so nobody can probe another user. It is STABLE and SECURITY DEFINER, with `search_path = ''`.
  - The base-table policy `public_read_active_non_expired` is replaced by `subscriber_read_active_non_expired`. `ugc_select_own` stays, so authors keep reading their own rows.
  - `listings_public` is recreated with the same 036 columns, adds `security_barrier`, and gates rows on subscriber OR author OR `auth.role() = 'service_role'`. The gate has to live in the view because the view runs as its owner (010) and so ignores table RLS.
  - `listings_paywall_teaser(p_city, p_since, p_limit)` returns only `(listing_count, photo_urls)`, capped at 6 distinct photos. Its city table must match `lib/geo/italian-cities.ts`, enforced by `lib/paywall/teaser-sql-parity.test.ts`.
  - Requires 043.

### Why grace starts at `past_due_since`

Stripe advances `current_period_end` when it attempts the renewal, so a failed renewal already carries the next period's end. "Period end + 3 days" would therefore grant most of another period. The grace window is `now < past_due_since + 3 days`, in both `lib/subscriptions/entitlement.ts` (`PAST_DUE_GRACE_MS`) and the SQL helper; the parity test checks the two match. The Stripe behaviour is inferred from its renewal model, not measured against Stripe.

### App changes (all paths that read listings)

- **Read client.** With the flag on, server reads (`lib/listings/queries.ts`: home, detail, similar, by-ids) and browser reads (`lib/listings/client-queries.ts`: feed poll, favorites, onboarding fallback) use the user's session client, so the 044 gate sees subscribers. With the flag off they stay session-free; the home DOM is identical to `main`.
- **Locked home teaser.** `getLockedTeaser()` calls the teaser function; if it is missing (before 044) or fails, it falls back to building the teaser from rows.
- **Onboarding city teaser.** With the flag on it uses the per-city teaser function, with the same fallback. With the flag off it is unchanged.
- **Detail page.** It checks access first. When locked, only the author's own listing renders; everything else shows the lock, so it never 404s and never fetches the row.
- **Alert pushes.** With the flag on, pushes go only to entitled users, because a push carries the listing title. Matches are still recorded. The Settings matches list already drops rows whose listing is hidden.
- **Unaffected:** owner reads, UGC status patches and rate limits (author policy), the cron and admin (service role). There is no sitemap or OG-image route.
- **Operator scripts** (`scripts/*uat*.mjs`, `scraper/scripts/check-visible-*.mjs`) read `listings_public` with the anon key and will see 0 rows after 044 unless switched to the service role.

### Verification (this task)

```
supabase/tests/run-local.sh   # throwaway supabase/postgres:17, applies 47 migrations in order, runs both *.check.sql
                              # -> 042 CHECKS PASSED; 044: 17 PASS lines + CHECKS PASSED 044
npm run lint / npx tsc --noEmit   # 1 error, pre-existing on main: lib/favorites/store.test.ts:56
npm test                          # Test Files 125 passed (125), Tests 754 passed (754)
npm run build (Node 22)           # Compiled successfully, 51/51 static pages (flag off and flag on)
drive.mjs flag-off 4/4, onboarding 33/33, desktop-paywall 2/2, compare 2/2 (home DOM identical to main, pixel diff empty), persist (flag on) 9/9
```

- The browser journeys run against the remote database, which does not have 044, so with the flag on they exercise the **pre-044 fallback** for the teaser. The 044 function path is proven by the SQL checks and by unit tests with a mocked RPC.
- The test shim (`supabase/tests/support/hosted-supabase-shim.sql`) stubs `storage.*`, `auth.jwt()`, and hosted-style `auth.uid()` and `auth.role()` for the bare image. The runner drops `listings_public` before migrations that `create or replace` it, because 020 reorders its columns.

### Go-live checklist (order matters)

1. Apply 043 (safe now).
2. Confirm Stripe test purchases unlock and lock correctly with the flag on a Preview.
3. Apply 044 **and** set `NEXT_PUBLIC_PAYWALL_ENABLED=true` in the same release.
4. Switch the operator diagnostic scripts to the service role.

### Open questions for Guang

- **Legal review** of the new Terms and Privacy sections (en/it/zh). In particular: the EU 14-day right of withdrawal for digital subscriptions is not addressed, there are no refund promises, and "cancelling does not refund the current period" matches what the code does.
- **Session expiry.** After 044, a subscriber whose session JWT expired sees an empty feed until the session refreshes. PostgREST also sporadically rejects fresh JWTs here (PGRST303). If this shows up in Preview, the fix is to serve listings through a server route that checks entitlement and reads with the service role.
- **Report filters.** The locked teaser count cannot subtract listings the viewer reported locally, so it may differ from the open feed by a few.

---

## Earlier: 261025-vwf. Stripe test-mode subscriptions

Stripe **test-mode** subscriptions behind the hard paywall. 
Nothing here was applied or created remotely. No migration was run against Supabase, no Stripe products or prices were created, and no keys or Vercel settings were touched.

### Done

- **Migration file `supabase/migrations/042_subscriptions.sql`.** Not applied anywhere remote.
  - It creates `public.subscriptions` with one row per user.
  - RLS: `authenticated` can select its own row. There are no write policies, and anon/authenticated have insert, update and delete revoked.
  - `apply_subscription_state(...)` is a security-definer upsert that only `service_role` can execute. It ignores writes older than `last_event_at`, so webhook retries and reordering converge.
  - Checked against a throwaway local `supabase/postgres:17` container: it applies twice idempotently, and `supabase/tests/042_subscriptions.check.sql` prints `CHECKS PASSED` (stale skip, own-row RLS, denied writes, anon sees nothing).
- **Library code:**
  - `lib/stripe/config.ts` enables payments only when all five Stripe vars are set and refuses `sk_live_` keys.
  - `lib/subscriptions/entitlement.ts`: only `active` and `trialing` with an unexpired period unlock. `past_due` stays locked.
  - `lib/subscriptions/sync.ts` maps Stripe events to rows.
  - `lib/subscriptions/store.ts` does service-role reads and RPC writes.
- **Routes:**
  - `POST /api/stripe/checkout` needs sign-in and creates a subscription Checkout with `client_reference_id` and `subscription_data.metadata.user_id`. It returns 503 `payments_disabled` without env and 409 if already subscribed.
  - `GET /api/stripe/checkout/return` is the success_url. It syncs immediately so the user isn't stuck locked while the webhook is in flight, and it verifies the session belongs to the user.
  - `POST /api/stripe/portal` opens the Customer Portal.
  - `POST /api/stripe/webhook` verifies the signature against the raw body and handles `checkout.session.completed` and `customer.subscription.created/updated/deleted`. It returns 500 on write failure so Stripe retries.
  - `GET /api/subscription` reports status for the paywall Restore button and Settings.
- **Gate.** `getSubscriptionActive()` now reads the table for the signed-in user and fails closed.
- **UI:**
  - The paywall CTA posts to Checkout. A 503 shows "Payments aren't enabled yet" (the current state everywhere), 401 asks the user to sign in, and 200 redirects to Stripe.
  - Restore asks guests to sign in and reloads for subscribers.
  - Settings has a "Manage subscription" entry (flag-on builds and Stripe customers only).
  - The locked view shows "activation can take a minute" after returning from Checkout.
- **Account deletion** cancels a live Stripe subscription first, and refuses (502) if Stripe can't cancel. This prevents billing a deleted user.

### How to verify

```
npm test           # 124 files, 745 tests passed (route tests sign payloads with stripe.webhooks.generateTestHeaderString)
npm run lint       # 1 error, pre-existing on main: lib/favorites/store.test.ts:56
npx tsc --noEmit   # same single error
# Node 22 build + app checks via .claude/skills/verify-snap-it-free (see SKILL.md):
#   flag-off 3/3, onboarding 33/33 (CTA -> 503 -> coming soon), compare vs main 2/2 (DOM identical),
#   flag-on persist 6/6; curl: checkout/portal/webhook -> 503 payments_disabled without env.
psql <throwaway db> -f supabase/migrations/042_subscriptions.sql -f supabase/tests/042_subscriptions.check.sql
```

### Not verified (needs Guang's setup)

A real end-to-end purchase is unverified. That means signed-in user → Stripe test Checkout → webhook → unlocked feed → Portal → cancel → locked again. It needs everything in the list below.

### Decisions (superseded)

The nine open items listed here were answered on 2026-10-25 23:14; see the table at the top.

### Notes for the next engineer

- Checkout success and cancel URLs use the request origin (`new URL(request.url).origin`). On Vercel that's the public host. Behind another proxy, check it.
- `checkout.session.completed` refetches the subscription. `customer.subscription.*` events use the payload as-is. Both are stamped with `event.created` for ordering.
