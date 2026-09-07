# Supabase JWT signing mismatch — runbook

**Project ref:** `wnerhajyjjmrtsdmdpzu`  
**Dashboard:** https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu  
**Status:** Blocker for all authenticated user flows (favorites, alerts, messaging, UGC write paths)

## Symptom

- Email / Google / Apple **login succeeds** (GoTrue accepts credentials)
- Immediately after login, **every database call fails** with HTTP 500
- PostgREST error body often includes `"JWT issued at future"` (misleading — not a clock skew issue)
- **Service role** queries still work (200) — only user session JWTs fail

## Root cause (corrected 2026-09-06 — supersedes the 2026-08-31 theory)

**Not a signing-algorithm mismatch, and not a dev-machine clock problem.**
The project's PostgREST instance has a **stale cached "current time"**, so any JWT whose
`iat` is newer than that frozen value is rejected as "issued at future".

### Evidence

| Probe | Result | What it rules out |
|-------|--------|-------------------|
| Local vs Supabase edge vs Google `Date` headers | identical to the second | dev-machine clock skew |
| Fresh user token `iat` − local now | **1 s** | token really is not future-dated |
| Same token retried 22× over 5.5 min | **401 every time** | genuine drift (drift self-heals; PostgREST tolerates 30 s) |
| `sb_secret_*` (an **opaque key, not a JWT**) | same `PGRST303` | anything our client sends — the rejected JWT is minted *inside* Supabase's gateway |
| Legacy `eyJ` JWT, `iat` = 2026-07-28 | **200** | ES256 verification being broken (an old-enough `iat` passes) |
| `sb_publishable_*` apikey-only | **200** | project/API-key misconfiguration |
| `rg 'pgrst\|jwt_secret\|ALTER ROLE authenticator'` over repo | no hits | our migrations pinning PostgREST JWT config |

PostgREST's frozen clock sits somewhere between 2026-07-28 (legacy `iat` — accepted) and
2026-09-06 15:16 (fresh `iat` — rejected). If ES256 verification were the problem the error
would be a key/signature failure (`PGRST301`, `No suitable key`), not an `iat` complaint —
and the `sb_secret_*` path involves no ES256 at all yet fails identically.

### Upstream

Known, unfixed bug in PostgREST's cached-time thread (Haskell `auto-update` / `mkAutoUpdate`):

- [PostgREST#5196 — PGRST303: JWT issued at future](https://github.com/PostgREST/postgrest/issues/5196) (open, `needs repro`)
- [PostgREST#5172 — still reproducible on v14.17](https://github.com/PostgREST/postgrest/issues/5172)
- [PostgREST#5199 — `jwt-allowed-skew-seconds` config](https://github.com/PostgREST/postgrest/pull/5199) (mitigation, min 30 s)
- [supabase#49655 — PGRST303 with `sb_secret_` key](https://github.com/supabase/supabase/issues/49655)

Upstream reports are **intermittent** (one stale node in a fleet). Ours is **100 % persistent**,
consistent with this project being pinned to a single PostgREST instance whose time thread is stuck.

### Fix

**Restart the project** to recycle the PostgREST container (Dashboard → Settings → General /
Infrastructure → *Restart project*). Then re-run the verify script. Only open a support ticket
if a restart does not clear it.

The JWT signing key migration itself is **complete and correct** — do not roll it back.

## Verify before fixing

From repo root (loads `.env.local` if present):

```bash
node scripts/verify-supabase-jwt-signing.mjs
```

Expected output while broken:

- JWKS: `ES256` with kid `8530bc5d-3607-4c3c-9001-79a67a43ac0d`
- `[PASS] publishable (apikey only)`
- `[FAIL] user ES256 session` and `[FAIL] sb_secret` — often `"JWT issued at future"` (PGRST303)
- Verdict: **INCOMPLETE** — user sessions will fail on REST

Step-by-step Dashboard actions: **`docs/ops/supabase-jwt-migration-checklist.md`**

Manual spot-check:

```bash
curl -s "https://wnerhajyjjmrtsdmdpzu.supabase.co/auth/v1/.well-known/jwks.json" | jq .
```

## Fix (requires Supabase Dashboard owner access)

You need a login that can see project `wnerhajyjjmrtsdmdpzu` in the project list. Current dev accounts may not have access — use the org owner account.

### Step 1 — Inspect JWT signing state

1. Open **Project Settings → API** (or **API Keys → JWT Signing Keys**, wording varies by dashboard version)
2. Look for **JWT Signing Keys** / **Legacy JWT secret** / **Key rotation** section
3. Check whether a migration from **legacy shared secret (HS256)** to **asymmetric keys (ES256)** was started but not completed

### Step 2 — Choose a path

**Option A — Complete the migration (recommended)**

Follow Supabase docs for [JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys):

1. Ensure the new asymmetric key is **published / rotated** so PostgREST trusts JWKS
2. After rotation completes, **regenerate API keys** in Project Settings → API if prompted
3. Copy fresh `anon` and `service_role` keys into:
   - `.env.local` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
   - Vercel env vars
   - Fly.io / scraper secrets (`SUPABASE_SERVICE_ROLE_KEY`)
4. Redeploy app + restart scraper worker

**Option B — Roll back to legacy secret**

If migration is stuck and you need immediate unblocking:

1. Revert signing to **legacy JWT secret** so GoTrue issues HS256 tokens again (matches current `.env` keys)
2. Do **not** leave in hybrid state — both sides must use the same verification path
3. Plan a coordinated re-migration later

### Step 3 — Confirm resolution

```bash
node scripts/verify-supabase-jwt-signing.mjs
# Should report MATCH or legacy-consistent state

# Then in browser: log in → open favorites or any authed view → no 500
```

## If a project restart does not clear it

Open a support ticket — **do not describe this as a signing-key migration problem**, that
sends support down the wrong path. Use:

```
Project ref: wnerhajyjjmrtsdmdpzu

PostgREST rejects every JWT with a current `iat` as PGRST303 "JWT issued at future",
persistently (not intermittently). A project restart did not clear it.

  sb_publishable_* apikey-only          -> 200
  legacy eyJ service_role (iat Jul 28)  -> 200
  sb_secret_* (opaque key, no JWT sent) -> 401 PGRST303
  fresh GoTrue ES256 user session       -> 401 PGRST303

The sb_secret_* case sends no JWT at all, so the rejected token is minted inside your
gateway. Fresh token iat was 1s from real time; local/edge/Google clocks agree to the
second; the same token failed 22x over 5.5min (well past PostgREST's 30s skew allowance).
An old-enough iat is accepted, so signature verification works — only the validator's
notion of "now" is wrong.

This looks like PostgREST#5196 / supabase#49655 (stale mkAutoUpdate time thread), but
pinned permanently on our instance. Please recycle the PostgREST node for this project.
```

## Resolved 2026-09-06 — restart cleared it

A project restart fixed every failing probe, confirming the stale-clock diagnosis:

```
[PASS] publishable (apikey only)
[PASS] sb_secret (apikey+bearer)
[PASS] sb_secret RPC delete_account_data
[PASS] legacy JWT (apikey+bearer)
[PASS] user ES256 session
Verdict: MIGRATION COMPLETE
```

The temporary legacy-JWT preference in `resolveServiceRoleKey()` was removed in the same
change — it would have broken the app the moment the legacy key was revoked.
`resolveServiceRoleKey()` now just prefers `SUPABASE_SERVICE_ROLE_KEY`, with
`SUPABASE_SERVICE_ROLE_JWT` / `SCRAPER_ADMIN_SERVICE_ROLE_KEY` only as local-dev fallbacks.

Delete-account GET still counts claimed listings via the service client + `user.id` rather
than the user-session PostgREST client. That was independently the right shape and stays.

## If it recurs

The upstream bug is still open and is **intermittent** for most projects, so expect the odd
`PGRST303` even on a healthy instance. That case is now absorbed in the app:

- `isTransientRestError()` (`lib/supabase/rest-error.ts`) classifies `PGRST303` separately from
  a genuinely unverifiable token. `isRestJwtError()` no longer claims the session is invalid.
- `withRestRetry()` (`lib/supabase/rest-retry.ts`) re-runs the call up to 3 times, 300 ms apart,
  and only on `PGRST303`. Applied to favorites, favorites/merge, alert unread-count,
  delete-account count, and the `delete_account_data` RPC.
- `restErrorResponse()` returns **503** for an exhausted retry instead of 401, so a platform
  blip no longer signs users out.
- Messaging (`lib/messages/conversation-actions.ts`) keeps its stronger mitigation: `PGRST303`
  triggers `shouldFallback()` and the direct-Postgres path.

Only restart the project if `PGRST303` becomes **persistent** — that means a stuck instance
again, which retries cannot paper over. Confirm with the verify script first.

## Scraper worker (Fly)

`scraper/src/config.ts` builds `supabaseAdmin` with `createSupabaseRetryFetch()`
(`scraper/src/supabase-fetch.ts`), which retries at the transport layer so every query, RPC,
and storage call is covered without touching the ~32 call sites:

- `PGRST303` — always retried (rejected during auth, so nothing was committed)
- gateway `502/503/504/522` — retried for `GET`/`HEAD` only, since a write may already have landed

Two related defects were fixed at the same time, both found while investigating this:

1. `setInterval(tick, …)` in `scraper/src/worker.ts` passed an async function with no `.catch()`.
   Any Supabase blip inside a scheduler tick became an unhandled rejection and **killed the
   worker** — that is what a Supabase restart did on 2026-09-06 at 15:50 UTC.
2. `runSchedulerTick` threw raw PostgrestError objects, which Node reported as `"#<Object>"`.
   They are now wrapped in `Error` with the failing table named.

**Deployed key:** Fly held the legacy `eyJ` `SUPABASE_SERVICE_ROLE_KEY` long after
`scraper/.env` moved to `sb_secret_`. Verify before revoking the legacy key:

```bash
fly ssh console -a shoumanwu-scraper -C "/bin/sh -c 'printenv SUPABASE_SERVICE_ROLE_KEY | cut -c1-11'"
```

Check Vercel the same way — `fly secrets list` only shows digests, not values.

## Not fixable in application code

- Updating `@supabase/supabase-js` does not help — tokens are rejected server-side before RLS runs
- Client-side workarounds (service role in browser, disabling auth) are unsafe and out of scope
- Dev-machine clock sync is **not** the issue — local, Supabase edge, and Google `Date` all agreed to the second

## Related env vars

| Variable | Scope |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server / worker only |
| `SUPABASE_PROJECT_REF` | Optional; defaults from URL hostname |
