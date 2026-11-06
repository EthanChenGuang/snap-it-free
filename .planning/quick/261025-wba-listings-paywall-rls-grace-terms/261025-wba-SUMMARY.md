---
quick_id: 261025-wba
status: complete
date: 2026-10-26
---

# 261025-wba Summary: DB hard paywall (044), 3-day grace (043), subscription legal copy

Executed inline by the orchestrating agent with GSD artifacts. A duplicate session wrote the first 043 draft and then handed over; its runner and stub were superseded and removed.

## Delivered

- `supabase/migrations/043_subscriptions_past_due_since.sql`: additive, safe after 042.
- `supabase/migrations/044_listings_paywall_rls.sql`: go-live only, applied together with the flag.
- `supabase/tests/run-local.sh`, `support/hosted-supabase-shim.sql` and `044_listings_paywall_rls.check.sql`.
- App changes:
  - grace rule;
  - session read client with the flag on;
  - teaser RPC with pre-044 fallback;
  - detail page access first;
  - subscriber-only pushes;
  - SQL/TS parity test.
- Terms/Privacy subscription sections (en/it/zh), flag-on only, pending legal review.
- Records of decisions 1–8 in PRODUCT.md, HANDOFF.md and STATE. The verify skill is extended.

## Verification (real output)

- `supabase/tests/run-local.sh`: applied 47 migrations in order. 042 CHECKS PASSED. 044 printed 17 PASS lines and CHECKS PASSED 044.
- `npm test`: Test Files 125 passed (125), Tests 754 passed (754).
- `npm run lint` / `npx tsc --noEmit`: only the pre-existing `lib/favorites/store.test.ts:56`.
- Build (Node 22): Compiled successfully, 51/51 static pages, both flag off and flag on.
- drive.mjs: flag-off 4/4, onboarding 33/33, desktop-paywall 2/2, compare 2/2 (DOM identical, pixel diff empty), persist (flag on) 9/9.

## Not proven in the browser

- The 044 teaser-function path. The remote database has no 044, so the browser exercises the fallback. The function itself is proven by the SQL checks and by unit tests with a mocked RPC.
