# Supabase JWT signing mismatch — runbook

**Project ref:** `wnerhajyjjmrtsdmdpzu`  
**Dashboard:** https://supabase.com/dashboard/project/wnerhajyjjmrtsdmdpzu  
**Status:** Blocker for all authenticated user flows (favorites, alerts, messaging, UGC write paths)

## Symptom

- Email / Google / Apple **login succeeds** (GoTrue accepts credentials)
- Immediately after login, **every database call fails** with HTTP 500
- PostgREST error body often includes `"JWT issued at future"` (misleading — not a clock skew issue)
- **Service role** queries still work (200) — only user session JWTs fail

## Root cause (confirmed 2026-08-31)

Supabase JWT signing is in a **partial migration state**:

| Component | Signing / verification | Algorithm |
|-----------|------------------------|-----------|
| GoTrue (Auth) | Issues user session tokens | **ES256** (asymmetric), kid `8530bc5d-3607-4c3c-9001-79a67a43ac0d` |
| JWKS endpoint | Public verify keys published | ES256 — see `/auth/v1/.well-known/jwks.json` |
| `.env` anon + service_role keys | Legacy API keys | **HS256** (symmetric, shared legacy JWT secret) |
| PostgREST / Data API | Validates incoming user JWTs | Still using **legacy HS256 secret** — cannot parse ES256 tokens |

GoTrue and PostgREST disagree on how to verify the same session token. Auth succeeds; Data API rejects it.

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

## If dashboard looks correct but issue persists

This is likely an internal Supabase platform inconsistency. Open a support ticket with:

- Project ref: `wnerhajyjjmrtsdmdpzu`
- JWKS kid: `8530bc5d-3607-4c3c-9001-79a67a43ac0d`
- Error: PostgREST 500 `"JWT issued at future"` on user JWT; service_role works
- Evidence: JWKS returns ES256; env API keys decode as HS256

## Application workaround (2026-09-06)

Until Dashboard signing migration is complete, server routes use `resolveServiceRoleKey()` (`lib/supabase/service-role-key.ts`):

1. If `SUPABASE_SERVICE_ROLE_KEY` is legacy `eyJ...` JWT → use it.
2. If primary is `sb_secret_*` → prefer `SUPABASE_SERVICE_ROLE_JWT`, then `SCRAPER_ADMIN_SERVICE_ROLE_KEY` when those are legacy JWTs.
3. Delete-account GET no longer queries PostgREST with the user session JWT (uses service role + `user.id`).

Local dev: `.env.local` already has `SCRAPER_ADMIN_SERVICE_ROLE_KEY=eyJ...`; no extra env change required unless that var is absent.

## Not fixable in application code

- Updating `@supabase/supabase-js` does not help — tokens are rejected server-side before RLS runs
- Client-side workarounds (service role in browser, disabling auth) are unsafe and out of scope
- Clock sync on dev machines is **not** the issue when JWKS already shows ES256 issuance

## Related env vars

| Variable | Scope |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server / worker only |
| `SUPABASE_PROJECT_REF` | Optional; defaults from URL hostname |
