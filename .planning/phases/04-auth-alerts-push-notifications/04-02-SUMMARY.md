---
phase: 04-auth-alerts-push-notifications
plan: 02
subsystem: auth-oauth
status: complete
tags: [oauth, pkce, auth-modal, wave-1]

requires:
  - 04-01-schema-wave0
provides:
  - google-oauth-modal
  - apple-oauth-modal-gated
  - modal-title-override
affects:
  - 04-03-favorites-gate
  - 04-04-alerts-gate

tech-stack:
  added: []
  patterns:
    - signInWithOAuth-pkce-redirectTo
    - env-gated-apple-provider

key-files:
  created: []
  modified:
    - components/ugc/AuthPromptModal.tsx
    - app/auth/callback/route.ts
    - messages/it.ts
    - .env.example

key-decisions:
  - "Apple OAuth gated by NEXT_PUBLIC_APPLE_OAUTH_ENABLED until Supabase Apple provider configured"
  - "modalTitle prop for action-specific gates without duplicating modal (D-93)"
  - "Google icon retains brand colors; buttons use Stitch secondary outline variant (D-91)"

requirements-completed:
  - AUTH-01

coverage:
  - deliverable: "Google OAuth PKCE round-trip with session"
    human_judgment: true
    rationale: "Requires Supabase Google provider + redirect URLs configured in dashboard"
  - deliverable: "AuthPromptModal three-provider UI"
    human_judgment: false
    verification:
      - kind: test
        ref: "npm run test:lib -- lib/auth/safe-next-path.test.ts"
        status: pass
      - kind: build
        ref: "npm run build"
        status: pass

metrics:
  duration: "5 min"
  completed: "2026-08-01"
---

# Phase 4 Plan 02: OAuth (Wave 1) Summary

**One-liner:** Google and Apple OAuth buttons in AuthPromptModal with unified PKCE callback redirect; modalTitle override for action-specific gates.

## Accomplishments

- Extended `AuthPromptModal` with Google and Apple `signInWithOAuth` using same `redirectToUrl` as magic link (D-90)
- Stitch monochrome outline buttons, "oppure" divider between OAuth and email form (D-91)
- Action-agnostic Italian copy: "Accedi per continuare" plus `favoriteTitle` / `alertTitle` for later gates (D-93)
- Apple button disabled with tooltip until `NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true`
- Callback logs `exchangeCodeForSession` errors; imports `safeNextPath` from lib (Plan 01)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Env gate for Apple | Supabase Apple provider needs Apple Developer credentials; ship Google+email first per RESEARCH |
| modalTitle prop | D-93 prep without duplicating modal component per gate |
| Google brand icon | Recognizability; button chrome stays Stitch secondary outline |

## Deviations from Plan

None - plan executed exactly as written.

## Test Results

```
npm run test:lib -- lib/auth/safe-next-path.test.ts
Test Files  20 passed (20)
Tests       76 passed (76)

npm run build
Build succeeded (webpack)
```

## Human Setup Required — Supabase OAuth (AUTH-01)

### 1. Supabase Dashboard → Authentication → URL Configuration

- **Site URL:** `http://localhost:3000` (dev) and production URL
- **Redirect URLs (allow list):**
  - `http://localhost:3000/auth/callback`
  - `https://your-production-domain.com/auth/callback`

### 2. Google Provider

**Supabase:** Authentication → Providers → Google → Enable

- Add **Client ID** and **Client Secret** from Google Cloud Console

**Google Cloud Console:** APIs & Services → Credentials → Create OAuth 2.0 Web client

- **Authorized redirect URI:** `https://{project-ref}.supabase.co/auth/v1/callback`
  - Example: `https://wnerhajyjjmrtsdmdpzu.supabase.co/auth/v1/callback`

### 3. Apple Provider (optional — defer until credentials ready)

**Supabase:** Authentication → Providers → Apple → Enable

- Services ID, Team ID, Key ID, `.p8` secret from Apple Developer

**Apple Developer:** Certificates, Identifiers & Profiles

- Create Services ID, enable Sign In with Apple
- Configure return URLs for Supabase callback

**App env:** Set `NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true` in `.env.local` after Apple provider is live

### 4. Manual verification (checkpoint auto-approved in --auto mode)

1. Confirm Google provider enabled with redirect URLs above
2. Open `/post` logged out → trigger auth modal
3. Click **Continua con Google** → complete OAuth → land back on `/post` with session
4. Verify session: browser devtools → Application → cookies, or Settings profile (Plan 04)

## Commits

| Hash | Message |
|------|---------|
| 88293e3 | feat(04-02): add Google and Apple OAuth to AuthPromptModal |
| f1a0550 | feat(04-02): add modalTitle override and Apple OAuth env gate |

## Self-Check: PASSED

- FOUND: components/ugc/AuthPromptModal.tsx
- FOUND: app/auth/callback/route.ts
- FOUND: messages/it.ts
- FOUND: 88293e3, f1a0550
