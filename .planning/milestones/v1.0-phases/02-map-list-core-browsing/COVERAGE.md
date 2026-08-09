# API Coverage — Supabase PostgREST (Phase 2)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

Phase 2 integrates Supabase as the read-only listing store for map, list, detail, and favorites hydration.

| capability | decision | reason |
|---|---|---|
| SELECT active listings (status, expiry, zone filters) | INTEGRATE | |
| SELECT listing by UUID | INTEGRATE | |
| SELECT listings by ID list (favorites hydrate) | INTEGRATE | |
| Auth sign-in / sign-up | OPT-OUT | deferred to Phase 4 — browse is login-optional |
| Realtime subscriptions | OPT-OUT | poll refresh every 5 min instead; scraper cadence is 1–2 hr |
| INSERT / UPDATE / DELETE listings | OPT-OUT | Phase 2 is read-only; scraper writes in Phase 1 |
| Storage (photos upload) | OPT-OUT | scraped photo_url only; UGC upload in Phase 3 |
| RPC / Edge Functions | OPT-OUT | not used in Phase 2 browsing slice |
| Row-level security bypass / service role | OPT-OUT | anon client only; RLS enforced via migration 004 |
